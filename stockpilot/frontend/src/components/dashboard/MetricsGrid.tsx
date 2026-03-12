import { Boxes, Package, RotateCcw, Warehouse } from "lucide-react";
import type { OverviewMetrics } from "../../types/stock";
import { formatNumber, formatPercent } from "../../utils/formatting";
import { KPICard } from "./KPICard";

interface MetricsGridProps {
    overview: OverviewMetrics;
}

export function MetricsGrid({ overview }: MetricsGridProps) {
    return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KPICard
                label="Products"
                value={formatNumber(overview.totalProducts)}
                detail={`${overview.warehouses} warehouses in the file`}
                icon={<Boxes className="h-5 w-5" />}
                tone="brand"
            />
            <KPICard
                label="Inventory"
                value={formatNumber(overview.totalInventory)}
                detail={`${overview.stagnantItems} stagnant lines detected`}
                icon={<Package className="h-5 w-5" />}
                tone="success"
            />
            <KPICard
                label="Net Sales"
                value={formatNumber(overview.totalNetSales)}
                detail={`${overview.slowMovingItems} slow-moving lines`}
                icon={<Warehouse className="h-5 w-5" />}
                tone="danger"
            />
            <KPICard
                label="Returns"
                value={formatNumber(overview.totalReturns)}
                detail={`Avg return rate ${formatPercent(overview.averageReturnRate)}`}
                icon={<RotateCcw className="h-5 w-5" />}
                tone="warning"
            />
        </div>
    );
}
