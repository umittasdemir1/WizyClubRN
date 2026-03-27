interface AuditSectionHeaderProps {
    title: string;
}

export function AuditSectionHeader({ title }: AuditSectionHeaderProps) {
    return (
        <div className="pt-1">
            <h3 className="font-display text-[1rem] font-semibold tracking-tight text-ink sm:text-[1.05rem]">
                {title}
            </h3>
        </div>
    );
}
