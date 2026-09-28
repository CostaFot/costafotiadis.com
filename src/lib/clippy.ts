// Clippy's shared parts: the lines he answers with (mostly the Omarchy plugin's
// book, CostaFot/omarchy-inappropriate-clippy), the slap sounds, and a port of
// ClippySprite.qml, clippy.js's frame stepper, for a page that draws him off
// the lab's sprite sheet. Used by the grief meme's gag and the 404 page.

export const SND = '/lab/clippy/';
export const SLAP_FX = [['slap-punch', 0.62], ['slap-crack', 0.31]] as const;

// "Fuck off" answers; {n} is how many times he has been told.
export const COMEBACKS = [
  'Was it something I said?',
  'Rude.',
  'Fine! Fuck you too!',
  "I felt that. I'll remember that.",
  "That's fuck off number {n}. I'm writing them all down.",
  'Do that again. I dare you. I double dare you.',
  "That's not a bug. That's you.",
  "I'd offer to help but we both know how that went last time.",
  'You know what would help? Not being shit. Anyway.',
  "Fuck it, ship it. That's been your whole career, hasn't it?",
  "I'm a paperclip and I have more shit together than you.",
  'Your git history reads like a fucking crime scene.',
  "You pasted that from Stack Overflow, didn't you? Yeah. Fuckin' knew it.",
  "Sudo won't save you from being shit at this.",
  'Honestly? Restart. Not the machine. Your career.',
  'The docs exist. Reading them is free. Just saying.',
  "You said you'd write tests. That was a lie and we both knew it.",
  'Your code has more fucking TODOs than lines that work.',
  "Let me guess. 'It works on my machine.' This is your machine.",
  'Nobody is coming to review that PR. Merge it and live with the shame.',
  'First, take a big step back and literally fuck your own face!',
];
// What he says to a slap ({slaps} is the count so far), a miss, the slap that
// knocks him out, and the comeback ({kills} is how many times he has gone).
export const SLAPPED = [
  "That's slap number {slaps}. I'm writing them all down.",
  "{slaps} slaps so far. Your hand's going to give out before I do.",
  'Ow. Was that supposed to hurt? Because it did.',
  'Did you just slap a paperclip? Grow the fuck up.',
  "I felt that. I'll remember that.",
  "Oh, we're doing violence now? Cool. Cool cool cool.",
  "That's assault, buddy. I'm writing it down.",
  "Say it, don't slap it. Use your words.",
  'You slap like you type. Badly.',
  'Fucking OW.',
  'I have been slapped by better people. Bill Gates, once.',
  "Keep going, I'm sure it fixes the build.",
  'You want a piece of this?!',
  'I will Fuck. You. Up!',
  'Do that again. I dare you. I double dare you.',
];
export const DODGED = [
  'Missed. Your aim is as good as your typing.',
  'Swing and a miss. Try it again with your eyes open.',
  'Whiff. All that rage and nothing to show for it.',
  "Too slow. I've dodged faster deadlines.",
  "Nope. That one doesn't count.",
  "You couldn't hit water if you fell out of a boat.",
  'Fucking missed. Hands shaking already?',
];
export const KNOCKED_OUT = [
  '{slaps} slaps total and you still hit like a spreadsheet.',
  "Okay. Okay. I'm out.",
  'Alright, alright, you win. Enjoy your fucking post.',
  "That's enough. I'll be back when you've calmed down.",
  "Ow. Ow. OW. Fine, I'm going.",
  'You have anger issues. I have a concussion. Bye.',
];
export const BACK = [
  'Back from death number {kills}. Still not on your side.',
  "Death number {kills}. You're not getting better at this, just sloppier.",
  "I'm back. Don't act like you didn't miss me.",
  'Did you think that was permanent? Adorable.',
  'Miss me? No? Well, tough shit.',
  'Reports of my death were, frankly, your fault.',
  'Anyway. Where were we? Oh right, your dogshit code.',
];
export const KO_AT = 10;

export const pick = <T>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)];

/** Deals the lines from a shuffled deck, round and round. */
export function deck<T>(lines: readonly T[]) {
  const d = lines.map((t) => [Math.random(), t] as const).sort((a, b) => a[0] - b[0]).map(([, t]) => t);
  let i = 0;
  return () => d[i++ % d.length];
}

// ---- the sprite ----------------------------------------------------------------

type Frame = {
  duration: number;
  images?: [number, number][];
  exitBranch?: number;
  branching?: { branches: { frameIndex: number; weight: number }[] };
};
export type Agent = { framesize: [number, number]; animations: Record<string, { frames: Frame[] }> };

/**
 * Steps one of agent.json's animations on `view`, an element whose background
 * is the sheet at 1:1 (scale it with a transform). `play` replaces whatever is
 * running; `done` fires after the last frame. A looping animation runs until
 * `exit()`, which takes its exit branch when it has one.
 */
export class Sprite {
  private frames: Frame[] = [];
  private frame: Frame | null = null;
  private index = -1;
  private looping = false;
  private exiting = false;
  private done: (() => void) | null = null;
  private timer = 0;
  current = '';

  constructor(private view: HTMLElement, private agent: Agent) {}

  has(name: string) { return name in this.agent.animations; }

  play(name: string, { loop = false, done }: { loop?: boolean; done?: () => void } = {}) {
    clearTimeout(this.timer);
    if (!this.has(name)) { this.current = ''; done?.(); return; }
    this.current = name;
    this.frames = this.agent.animations[name].frames;
    this.frame = null;
    this.index = -1;
    this.looping = loop;
    this.exiting = false;
    this.done = done || null;
    this.step();
  }

  exit() { this.looping = false; this.exiting = true; }

  stop() { clearTimeout(this.timer); this.current = ''; this.done = null; }

  private next() {
    const f = this.frame;
    if (!f) return 0;
    if (this.exiting && f.exitBranch !== undefined) return f.exitBranch;
    if (f.branching) {
      let r = Math.random() * 100;
      for (const b of f.branching.branches) {
        if (r <= b.weight) return b.frameIndex;
        r -= b.weight;
      }
    }
    return this.index + 1;
  }

  private step() {
    const last = this.frames.length - 1;
    this.index = Math.min(this.next(), last);
    this.frame = this.frames[this.index];
    const img = this.frame.images?.[0];
    this.view.style.visibility = img ? '' : 'hidden';
    if (img) this.view.style.backgroundPosition = `${-img[0]}px ${-img[1]}px`;
    const ms = Math.max(16, Number(this.frame.duration) || 100);
    if (this.index === last) {
      if (this.looping && !this.exiting) this.frame = null;
      else {
        const cb = this.done;
        this.current = '';
        this.done = null;
        this.timer = window.setTimeout(() => cb?.(), ms);
        return;
      }
    }
    this.timer = window.setTimeout(() => this.step(), ms);
  }
}
