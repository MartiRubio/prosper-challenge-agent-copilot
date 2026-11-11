/**
 * The Agent Studio mark: a step branching into two, one of them live.
 * The sidebar is navy, so the mark sits on a light tile there; the favicon
 * (public/favicon.svg) is the same drawing on a navy tile.
 */
export function BrandMark() {
    return (
        <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill="#eef4f8" />
            <path d="M16 12.5 9 19.5M16 12.5l7 7" stroke="#6f93ad" strokeWidth="2" strokeLinecap="round" fill="none" />
            <rect x="10.5" y="6" width="11" height="6.5" rx="2" fill="#013653" />
            <rect x="4" y="19.5" width="10" height="6.5" rx="2" fill="#013653" />
            <rect x="18" y="19.5" width="10" height="6.5" rx="2" fill="#ff421c" />
        </svg>
    );
}
