export function Spinner() {
    return (
        <div className="inline-flex items-center gap-3 text-sm text-slate-500">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand/20 border-t-brand" />
            Processing inventory snapshot...
        </div>
    );
}
