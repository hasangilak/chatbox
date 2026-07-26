import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Keep a scroll container pinned to the bottom as content arrives, and get out
 * of the way the moment the user scrolls up.
 *
 * ## Why unfollow is driven by input events, not scroll position
 *
 * The obvious implementation — "on scroll, follow = isAtBottom" — fights
 * itself. A smooth programmatic scroll emits `scroll` events the whole way
 * down, and during the animation the container is *not* at the bottom, so the
 * handler concludes the user scrolled away and cancels the very animation it
 * just started. Every "why does auto-scroll stop halfway" bug is this.
 *
 * So unfollowing is triggered only by evidence of **user intent** — a wheel
 * tick upward, a downward finger drag, a paging key, a scrollbar drag — none of
 * which a programmatic scroll can produce. Position is used only to *resume*
 * following, which is safe: re-arming something already armed is a no-op.
 *
 * ## Why new messages animate but streaming tokens don't
 *
 * A discrete new message is a place you want to be carried to, so it animates.
 * Streaming deltas arrive many times a second; starting a fresh smooth scroll
 * on each one queues animations that visibly stutter and never settle. While
 * the tail message is growing the container is pinned instantly instead, which
 * reads as the text simply staying in view.
 */

/** Distance from the bottom still considered "at the bottom", in px. */
const BOTTOM_EPSILON = 48;

/** How far below the fold content must be before offering a jump button. */
const UNSEEN_EPSILON = 120;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

export interface StickToBottomOptions {
  /**
   * Number of discrete items. A change animates the scroll.
   */
  itemCount: number;
  /**
   * Cheap fingerprint of content that grows *within* the last item — streaming
   * text, a widening tool result. A change pins instantly, without animation.
   */
  growthSignature: number;
  /**
   * Changing this jumps to the bottom with no animation and re-arms following.
   * Use the conversation id: a different thread is a new view, not a scroll.
   */
  resetKey: string | null;
}

export interface StickToBottom {
  /** Attach to the scrollable element. */
  scrollRef: React.RefObject<HTMLDivElement>;
  /** Attach to a wrapper around the content inside the scrollable element. */
  contentRef: React.RefObject<HTMLDivElement>;
  /** False once the user has scrolled away; true while we are pinning. */
  following: boolean;
  /** True when there is content below the fold worth offering a jump to. */
  hasUnseenBelow: boolean;
  /** Re-arm following and scroll down. Call this when the user sends. */
  followNow: (behavior?: ScrollBehavior) => void;
}

export function useStickToBottom(options: StickToBottomOptions): StickToBottom {
  const { itemCount, growthSignature, resetKey } = options;

  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Ref mirrors state so event handlers read the current value without being
  // re-bound on every change.
  const followingRef = useRef<boolean>(true);
  const [following, setFollowing] = useState<boolean>(true);
  const [hasUnseenBelow, setHasUnseenBelow] = useState<boolean>(false);

  // True while a pointer is held down inside the container, which is how a
  // scrollbar drag is told apart from a programmatic scroll.
  const pointerDownRef = useRef<boolean>(false);
  const touchStartYRef = useRef<number | null>(null);

  const setFollowingBoth = useCallback((next: boolean) => {
    followingRef.current = next;
    setFollowing(next);
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior) => {
    const el = scrollRef.current;
    if (!el) return;
    const effective: ScrollBehavior = prefersReducedMotion() ? "auto" : behavior;
    el.scrollTo({ top: el.scrollHeight, behavior: effective });
  }, []);

  const followNow = useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      setFollowingBoth(true);
      setHasUnseenBelow(false);
      // Wait a frame so any layout from the same commit is in before measuring.
      requestAnimationFrame(() => scrollToBottom(behavior));
    },
    [scrollToBottom, setFollowingBoth],
  );

  // -- user-intent listeners: the only things that stop following ------------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const stopFollowing = () => {
      if (followingRef.current) setFollowingBoth(false);
    };

    const onWheel = (e: WheelEvent) => {
      // Only upward intent unfollows. Scrolling down is left alone so reaching
      // the bottom re-arms naturally instead of needing a second gesture.
      if (e.deltaY < 0) stopFollowing();
    };

    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0]?.clientY ?? null;
    };

    const onTouchMove = (e: TouchEvent) => {
      const startY = touchStartYRef.current;
      const y = e.touches[0]?.clientY;
      if (startY === null || y === undefined) return;
      // Dragging the finger *down* pulls earlier content into view.
      if (y - startY > 8) stopFollowing();
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowUp" || e.key === "PageUp" || e.key === "Home") {
        stopFollowing();
      }
    };

    const onPointerDown = () => {
      pointerDownRef.current = true;
    };
    const onPointerUp = () => {
      pointerDownRef.current = false;
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("keydown", onKeyDown);
    el.addEventListener("pointerdown", onPointerDown, { passive: true });
    window.addEventListener("pointerup", onPointerUp, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("keydown", onKeyDown);
      el.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [setFollowingBoth]);

  // -- scroll position: re-arms following, and drives the jump button --------
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;

      if (distance <= BOTTOM_EPSILON) {
        // Back at the bottom — re-arm. Safe during our own animation because
        // it can only ever set this to the value it already has.
        if (!followingRef.current) setFollowingBoth(true);
        setHasUnseenBelow(false);
        return;
      }

      // A scrollbar drag produces no wheel/touch event, so this is the one
      // place position has to stand in for intent.
      if (pointerDownRef.current && followingRef.current) setFollowingBoth(false);

      setHasUnseenBelow(!followingRef.current && distance > UNSEEN_EPSILON);
    };

    const onScroll = () => {
      if (frame !== 0) return;
      frame = requestAnimationFrame(measure);
    };

    el.addEventListener("scroll", onScroll, { passive: true });
    measure();
    return () => {
      el.removeEventListener("scroll", onScroll);
      if (frame !== 0) cancelAnimationFrame(frame);
    };
  }, [setFollowingBoth]);

  // -- a different conversation is a new view, not a scroll -----------------
  useEffect(() => {
    setFollowingBoth(true);
    setHasUnseenBelow(false);
    // Two frames: one for the new tree to commit, one for its layout.
    const raf = requestAnimationFrame(() =>
      requestAnimationFrame(() => scrollToBottom("auto")),
    );
    return () => cancelAnimationFrame(raf);
  }, [resetKey, scrollToBottom, setFollowingBoth]);

  // -- a new message animates ----------------------------------------------
  const prevItemCount = useRef<number>(itemCount);
  useEffect(() => {
    const grew = itemCount > prevItemCount.current;
    prevItemCount.current = itemCount;
    if (!grew || !followingRef.current) return;
    requestAnimationFrame(() => scrollToBottom("smooth"));
  }, [itemCount, scrollToBottom]);

  // -- the tail message growing pins instantly ------------------------------
  useEffect(() => {
    if (!followingRef.current) return;
    scrollToBottom("auto");
  }, [growthSignature, scrollToBottom]);

  // -- growth React can't see: images, fonts, code blocks reflowing ---------
  useEffect(() => {
    const content = contentRef.current;
    if (!content || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (followingRef.current) scrollToBottom("auto");
    });
    observer.observe(content);
    return () => observer.disconnect();
  }, [scrollToBottom]);

  return { scrollRef, contentRef, following, hasUnseenBelow, followNow };
}
