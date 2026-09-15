/**
 * Upper bound for the wait between clicking the anchor and tearing it down.
 * `requestAnimationFrame` normally settles this far earlier; the timeout only
 * matters when rAF never fires (see {@link nextFrame}).
 */
const ANCHOR_CLEANUP_TIMEOUT_MS = 50;

/**
 * Yield once so the browser can pick up the anchor click before the caller
 * cleans up (e.g. revokes the object URL backing the anchor's `href`).
 *
 * `requestAnimationFrame` is the right signal (it fires after the click task has
 * been processed) but it never fires in hidden or backgrounded tabs. Racing it
 * against a timeout keeps the fast path while guaranteeing that the caller
 * always settles – otherwise the returned promise would hang forever and the
 * object URL would leak.
 */
function nextFrame(): Promise<void> {
    return new Promise<void>(resolve => {
        let settled = false;
        const done = (): void => {
            if (settled) {
                return;
            }
            settled = true;
            clearTimeout(timer);
            resolve();
        };

        const timer = setTimeout(done, ANCHOR_CLEANUP_TIMEOUT_MS);
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(done);
        }
    });
}

export interface AnchorAttributes {
    /** Value for the `download` attribute – left unset when omitted. */
    readonly download?: string;
    readonly target?: string;
    readonly rel?: string;
}

/**
 * Click a hidden, throw-away `<a>` element pointing at `url` and remove it
 * again. Resolves once the click has been handed to the browser.
 */
export async function clickAnchor(url: string, attributes: AnchorAttributes = {}): Promise<void> {
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = url;
    if (attributes.download !== undefined) {
        link.download = attributes.download;
    }
    if (attributes.target !== undefined) {
        link.target = attributes.target;
    }
    if (attributes.rel !== undefined) {
        link.rel = attributes.rel;
    }
    document.body.appendChild(link);

    try {
        link.click();
        await nextFrame();
    } finally {
        link.parentNode?.removeChild(link);
    }
}
