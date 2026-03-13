import {
    Fragment,
    useEffect,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
    type DragEvent,
    type PointerEvent as ReactPointerEvent
} from "react";
import { motion } from "framer-motion";
import {
    ArrowUpAZ,
    ArrowUpZA,
    BetweenHorizontalStart,
    BetweenVerticalStart,
    Check,
    ChevronDown,
    Diff,
    Grip,
    Palette,
    Plus,
    SquarePen,
    SlidersHorizontal,
    X
} from "lucide-react";
import type { AnalysisResult, AnalyzedInventoryRecord } from "../../types/stock";
import { formatNullableDate, formatNumber, formatPercent } from "../../utils/formatting";

type PivotZoneId = "filters" | "columns" | "rows" | "values";
type PivotFieldId = keyof AnalyzedInventoryRecord;

interface PivotLayout {
    filters: PivotFieldId[];
    columns: PivotFieldId[];
    rows: PivotFieldId[];
    values: PivotFieldId[];
}

interface PivotFieldDefinition {
    id: PivotFieldId;
    label: string;
    kind: "dimension" | "measure";
    summary: "sum" | "avg" | "count";
    format: "text" | "number" | "percent" | "date";
}

interface CanvasStudioProps {
    analysis: AnalysisResult | null;
}

interface PivotCombo {
    key: string;
    labels: string[];
}

interface AggregationState {
    sum: number;
    count: number;
}

interface DragState {
    fieldId: PivotFieldId;
    sourceZone: PivotZoneId | "fields";
}

interface PivotResult {
    valueFields: PivotFieldId[];
    rowCombos: PivotCombo[];
    columnCombos: PivotCombo[];
    matrix: Map<string, Map<string, Record<string, AggregationState>>>;
}

interface PivotTableInstance {
    id: string;
    name: string;
    layout: PivotLayout;
    headerColor: string;
    filterSelections: Record<string, string>;
    hasCustomizedSize: boolean;
    position: {
        x: number;
        y: number;
    };
    size: {
        width: number;
        height: number;
    };
}

interface StudioCanvasState {
    tables: PivotTableInstance[];
    activeTableId: string | null;
}

interface PivotTableView {
    table: PivotTableInstance;
    filterOptions: Record<string, string[]>;
    filteredRecords: AnalyzedInventoryRecord[];
    pivotResult: PivotResult;
    hasColumnGroups: boolean;
    hasMultipleValueFields: boolean;
    showSecondaryHeaderRow: boolean;
}

type HeaderFilterKind = "row-field" | "column-group" | "value-field" | "table-menu";
type HeaderFilterSortDirection = "asc" | "desc";

interface HeaderFilterOption {
    label: string;
    value: string;
}

interface HeaderFilterState {
    tableId: string;
    kind: HeaderFilterKind;
    headerKey: string;
    fieldId?: PivotFieldId;
    rowIndex?: number;
}

type TableResizeDirection =
    | "n"
    | "e"
    | "s"
    | "w"
    | "ne"
    | "nw"
    | "se"
    | "sw";

interface ResizeState {
    tableId: string;
    direction: TableResizeDirection;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
    startWidth: number;
    startHeight: number;
}

interface MoveState {
    tableId: string;
    startPointerX: number;
    startPointerY: number;
    startX: number;
    startY: number;
}

const STORAGE_KEY = "stockpilot-pivot-studio-layout-v3";
const ALL_FILTER_VALUE = "__all__";
const MIN_TABLE_WIDTH = 220;
const MIN_TABLE_HEIGHT = 220;
const DEFAULT_TABLE_WIDTH = 560;
const DEFAULT_TABLE_HEIGHT = 460;
const AUTO_FIT_SCROLLBAR_GUTTER = 16;
const ACTION_BAR_ICON_CLASS = "h-[18px] w-[18px]";
const ACTION_BAR_ICON_STROKE = 1.95;
const PIVOT_FIELD_TEXT_TYPOGRAPHY = "font-display text-[0.96rem] font-light leading-[1.04] tracking-tight";
const TABLE_HEADER_TEXT_TYPOGRAPHY = "font-display text-[1rem] font-light leading-[1.04] tracking-tight";
const DEFAULT_TABLE_HEADER_COLOR = "#080a0f";
const TABLE_HEADER_COLOR_OPTIONS = [
    "#080a0f",
    "#1d4ed8",
    "#0f766e",
    "#166534",
    "#a16207",
    "#c2410c",
    "#be123c",
    "#7c3aed",
    "#1e293b",
    "#475569"
];

const DEFAULT_LAYOUT: PivotLayout = {
    filters: [],
    columns: [],
    rows: [],
    values: []
};

const PIVOT_ZONES: {
    id: PivotZoneId;
    label: string;
}[] = [
    {
        id: "filters",
        label: "Filters"
    },
    {
        id: "columns",
        label: "Columns"
    },
    {
        id: "rows",
        label: "Rows"
    },
    {
        id: "values",
        label: "Values"
    }
];

const TABLE_RESIZE_HANDLES: {
    direction: TableResizeDirection;
    className: string;
}[] = [
    { direction: "n", className: "left-3 right-3 -top-[2px] h-[4px] cursor-ns-resize" },
    { direction: "e", className: "bottom-3 -right-[2px] top-3 w-[4px] cursor-ew-resize" },
    { direction: "s", className: "bottom-[-2px] left-3 right-3 h-[4px] cursor-ns-resize" },
    { direction: "w", className: "bottom-3 -left-[2px] top-3 w-[4px] cursor-ew-resize" },
    { direction: "ne", className: "-right-[2px] -top-[2px] h-[7px] w-[7px] cursor-nesw-resize" },
    { direction: "nw", className: "-left-[2px] -top-[2px] h-[7px] w-[7px] cursor-nwse-resize" },
    { direction: "se", className: "bottom-[-2px] -right-[2px] h-[7px] w-[7px] cursor-nwse-resize" },
    { direction: "sw", className: "bottom-[-2px] -left-[2px] h-[7px] w-[7px] cursor-nesw-resize" }
];

const PIVOT_FIELDS: PivotFieldDefinition[] = [
    { id: "warehouseName", label: "Warehouse", kind: "dimension", summary: "count", format: "text" },
    { id: "productCode", label: "Product Code", kind: "dimension", summary: "count", format: "text" },
    { id: "productName", label: "Product Name", kind: "dimension", summary: "count", format: "text" },
    { id: "color", label: "Color", kind: "dimension", summary: "count", format: "text" },
    { id: "size", label: "Size", kind: "dimension", summary: "count", format: "text" },
    { id: "gender", label: "Gender", kind: "dimension", summary: "count", format: "text" },
    { id: "productionYear", label: "Production Year", kind: "dimension", summary: "count", format: "text" },
    { id: "lastSaleDate", label: "Last Sale Date", kind: "dimension", summary: "count", format: "date" },
    { id: "firstStockEntryDate", label: "First Stock Entry Date", kind: "dimension", summary: "count", format: "date" },
    { id: "firstSaleDate", label: "First Sale Date", kind: "dimension", summary: "count", format: "date" },
    { id: "salesQty", label: "Sales Qty", kind: "measure", summary: "sum", format: "number" },
    { id: "returnQty", label: "Return Qty", kind: "measure", summary: "sum", format: "number" },
    { id: "inventory", label: "Inventory", kind: "measure", summary: "sum", format: "number" },
    { id: "netSalesQty", label: "Net Sales", kind: "measure", summary: "sum", format: "number" },
    { id: "returnRate", label: "Return Rate", kind: "measure", summary: "avg", format: "percent" },
    { id: "sellThroughRate", label: "Sell Through", kind: "measure", summary: "avg", format: "percent" },
    { id: "daysSinceLastSale", label: "Days Since Last Sale", kind: "measure", summary: "avg", format: "number" },
    { id: "stockAgeDays", label: "Stock Age Days", kind: "measure", summary: "avg", format: "number" },
    { id: "daysToFirstSale", label: "Days to First Sale", kind: "measure", summary: "avg", format: "number" }
];

function getFieldDefinition(fieldId: PivotFieldId) {
    return PIVOT_FIELDS.find((field) => field.id === fieldId)!;
}

function hexToRgba(hexColor: string, alpha: number) {
    const normalizedHex = hexColor.replace("#", "");
    const parsedHex =
        normalizedHex.length === 3
            ? normalizedHex
                  .split("")
                  .map((character) => `${character}${character}`)
                  .join("")
            : normalizedHex;

    const red = Number.parseInt(parsedHex.slice(0, 2), 16);
    const green = Number.parseInt(parsedHex.slice(2, 4), 16);
    const blue = Number.parseInt(parsedHex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function isHexColor(value: unknown): value is string {
    return typeof value === "string" && /^#(?:[0-9a-fA-F]{3}){1,2}$/.test(value);
}

function resolveTableHeaderColor(value: unknown) {
    return isHexColor(value) ? value : DEFAULT_TABLE_HEADER_COLOR;
}

function uniqueFieldIds(values: PivotFieldId[]) {
    return Array.from(new Set(values.filter((value) => PIVOT_FIELDS.some((field) => field.id === value))));
}

function sanitizeLayout(value: unknown): PivotLayout {
    if (!value || typeof value !== "object") {
        return DEFAULT_LAYOUT;
    }

    const candidate = value as Partial<Record<PivotZoneId, PivotFieldId[]>>;

    return {
        filters: uniqueFieldIds(candidate.filters ?? DEFAULT_LAYOUT.filters),
        columns: uniqueFieldIds(candidate.columns ?? DEFAULT_LAYOUT.columns),
        rows: uniqueFieldIds(candidate.rows ?? DEFAULT_LAYOUT.rows),
        values: uniqueFieldIds(candidate.values ?? DEFAULT_LAYOUT.values)
    };
}

function getDimensionValue(record: AnalyzedInventoryRecord, fieldId: PivotFieldId) {
    const field = getFieldDefinition(fieldId);
    const rawValue = record[fieldId];

    if (rawValue === null || rawValue === undefined || rawValue === "") {
        return "(Blank)";
    }

    if (field.format === "date") {
        return formatNullableDate(typeof rawValue === "string" ? rawValue : String(rawValue));
    }

    return String(rawValue);
}

function getMeasureInput(record: AnalyzedInventoryRecord, fieldId: PivotFieldId) {
    const field = getFieldDefinition(fieldId);
    const rawValue = record[fieldId];

    if (field.kind === "dimension" || field.summary === "count") {
        return {
            sum: rawValue === null || rawValue === undefined || rawValue === "" ? 0 : 1,
            count: rawValue === null || rawValue === undefined || rawValue === "" ? 0 : 1
        };
    }

    if (typeof rawValue === "number" && Number.isFinite(rawValue)) {
        return {
            sum: rawValue,
            count: 1
        };
    }

    return {
        sum: 0,
        count: 0
    };
}

function resolveAggregationValue(fieldId: PivotFieldId, state: AggregationState | undefined) {
    if (!state) {
        return 0;
    }

    const field = getFieldDefinition(fieldId);

    if (field.summary === "count") {
        return state.count;
    }

    if (field.summary === "avg") {
        return state.count > 0 ? state.sum / state.count : 0;
    }

    return state.sum;
}

function formatAggregatedValue(fieldId: PivotFieldId, value: number) {
    const field = getFieldDefinition(fieldId);

    if (field.format === "percent") {
        return formatPercent(value);
    }

    return formatNumber(value);
}

function buildComboKey(record: AnalyzedInventoryRecord, fieldIds: PivotFieldId[]) {
    if (fieldIds.length === 0) {
        return {
            key: "__total__",
            labels: ["Grand Total"]
        };
    }

    const labels = fieldIds.map((fieldId) => getDimensionValue(record, fieldId));
    return {
        key: labels.join("|||"),
        labels
    };
}

function sortCombos(combos: PivotCombo[]) {
    return [...combos].sort((left, right) =>
        left.labels.join(" / ").localeCompare(right.labels.join(" / "), "en")
    );
}

function createTableId() {
    return `pivot-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getActionBarNameWidth(label: string) {
    const normalizedLabel = label.trim();
    const estimatedWidth = Math.ceil(normalizedLabel.length * 9 + 48);
    return Math.min(240, Math.max(116, estimatedWidth));
}

function getDefaultTableSize() {
    return {
        width: DEFAULT_TABLE_WIDTH,
        height: DEFAULT_TABLE_HEIGHT
    };
}

function useTypewriter(words: string[], typingSpeed = 160, pauseMs = 2200, deletingSpeed = 80) {
    const [displayText, setDisplayText] = useState("");
    const [wordIndex, setWordIndex] = useState(0);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        const currentWord = words[wordIndex % words.length];

        if (isDeleting && displayText === "") {
            setIsDeleting(false);
            setWordIndex((prev) => prev + 1);
            return;
        }

        if (!isDeleting && displayText === currentWord) {
            const timeout = window.setTimeout(() => setIsDeleting(true), pauseMs);
            return () => window.clearTimeout(timeout);
        }

        const timer = window.setTimeout(() => {
            setDisplayText((prev) =>
                isDeleting
                    ? currentWord.substring(0, Math.max(0, prev.length - 1))
                    : currentWord.substring(0, Math.min(currentWord.length, prev.length + 1))
            );
        }, isDeleting ? deletingSpeed : typingSpeed);

        return () => window.clearTimeout(timer);
    }, [deletingSpeed, displayText, isDeleting, pauseMs, typingSpeed, wordIndex, words]);

    return displayText;
}

function createPivotTable(index: number): PivotTableInstance {
    const offset = (index - 1) * 36;
    return {
        id: createTableId(),
        name: `Table ${index}`,
        layout: DEFAULT_LAYOUT,
        headerColor: DEFAULT_TABLE_HEADER_COLOR,
        filterSelections: {},
        hasCustomizedSize: false,
        position: {
            x: offset,
            y: offset
        },
        size: getDefaultTableSize()
    };
}

function sanitizeTable(value: unknown, index: number): PivotTableInstance {
    const fallback = createPivotTable(index);
    if (!value || typeof value !== "object") {
        return fallback;
    }

    const candidate = value as Partial<PivotTableInstance>;
    const nextPosition =
        candidate.position &&
        typeof candidate.position === "object" &&
        typeof candidate.position.x === "number" &&
        typeof candidate.position.y === "number"
            ? {
                  x: candidate.position.x,
                  y: candidate.position.y
              }
            : fallback.position;
    const nextSize =
        candidate.size &&
        typeof candidate.size === "object" &&
        typeof candidate.size.width === "number" &&
        typeof candidate.size.height === "number"
            ? {
                  width: Math.max(MIN_TABLE_WIDTH, candidate.size.width),
                  height: Math.max(MIN_TABLE_HEIGHT, candidate.size.height)
              }
            : fallback.size;

    const nextFilterSelections =
        candidate.filterSelections && typeof candidate.filterSelections === "object"
            ? Object.fromEntries(
                  Object.entries(candidate.filterSelections).filter(
                      ([, currentValue]) => typeof currentValue === "string"
                  )
              )
            : {};
    const hasCustomizedSize =
        typeof candidate.hasCustomizedSize === "boolean"
            ? candidate.hasCustomizedSize
            : nextSize.width !== fallback.size.width || nextSize.height !== fallback.size.height;

    return {
        id: typeof candidate.id === "string" && candidate.id ? candidate.id : fallback.id,
        name: typeof candidate.name === "string" && candidate.name ? candidate.name : fallback.name,
        layout: sanitizeLayout(candidate.layout),
        headerColor: resolveTableHeaderColor(candidate.headerColor),
        filterSelections: nextFilterSelections,
        position: nextPosition,
        size: nextSize,
        hasCustomizedSize
    };
}

function sanitizeStudioState(value: unknown): StudioCanvasState {
    if (!value || typeof value !== "object") {
        const initialTable = createPivotTable(1);
        return {
            tables: [initialTable],
            activeTableId: initialTable.id
        };
    }

    const candidate = value as Partial<StudioCanvasState>;
    const nextTables =
        Array.isArray(candidate.tables) && candidate.tables.length > 0
            ? candidate.tables.map((table, index) => sanitizeTable(table, index + 1))
            : [createPivotTable(1)];

    const activeTableId =
        typeof candidate.activeTableId === "string" &&
        nextTables.some((table) => table.id === candidate.activeTableId)
            ? candidate.activeTableId
            : nextTables[0].id;

    return {
        tables: nextTables,
        activeTableId
    };
}

function buildFilterOptions(records: AnalyzedInventoryRecord[], filterFields: PivotFieldId[]) {
    return filterFields.reduce<Record<string, string[]>>((accumulator, fieldId) => {
        const values = sortCombos(
            Array.from(
                new Map(
                    records.map((record) => {
                        const label = getDimensionValue(record, fieldId);
                        return [label, { key: label, labels: [label] }];
                    })
                ).values()
            )
        ).map((entry) => entry.labels[0]);

        accumulator[fieldId] = values;
        return accumulator;
    }, {});
}

function applyFilters(
    records: AnalyzedInventoryRecord[],
    layout: PivotLayout,
    filterSelections: Record<string, string>
) {
    return records.filter((record) =>
        layout.filters.every((fieldId) => {
            const selectedValue = filterSelections[fieldId] ?? ALL_FILTER_VALUE;
            if (selectedValue === ALL_FILTER_VALUE) {
                return true;
            }

            return getDimensionValue(record, fieldId) === selectedValue;
        })
    );
}

function buildPivotResult(filteredRecords: AnalyzedInventoryRecord[], layout: PivotLayout): PivotResult {
    const valueFields = layout.values.length > 0 ? layout.values : [];

    if (valueFields.length === 0) {
        return {
            valueFields,
            rowCombos: [],
            columnCombos: [],
            matrix: new Map<string, Map<string, Record<string, AggregationState>>>()
        };
    }

    const rowMap = new Map<string, PivotCombo>();
    const columnMap = new Map<string, PivotCombo>();
    const matrix = new Map<string, Map<string, Record<string, AggregationState>>>();

    for (const record of filteredRecords) {
        const rowCombo = buildComboKey(record, layout.rows);
        const columnCombo = buildComboKey(record, layout.columns);

        rowMap.set(rowCombo.key, rowCombo);
        columnMap.set(columnCombo.key, columnCombo);

        const rowBucket = matrix.get(rowCombo.key) ?? new Map<string, Record<string, AggregationState>>();
        const cell =
            rowBucket.get(columnCombo.key) ??
            (Object.fromEntries(valueFields.map((fieldId) => [fieldId, { sum: 0, count: 0 }])) as Record<
                string,
                AggregationState
            >);

        for (const fieldId of valueFields) {
            const input = getMeasureInput(record, fieldId);
            cell[fieldId].sum += input.sum;
            cell[fieldId].count += input.count;
        }

        rowBucket.set(columnCombo.key, cell);
        matrix.set(rowCombo.key, rowBucket);
    }

    if (layout.rows.length === 0 && rowMap.size === 0) {
        rowMap.set("__total__", { key: "__total__", labels: ["Grand Total"] });
    }

    if (layout.columns.length === 0 && columnMap.size === 0) {
        columnMap.set("__total__", { key: "__total__", labels: ["Grand Total"] });
    }

    return {
        valueFields,
        rowCombos: sortCombos(Array.from(rowMap.values())),
        columnCombos: sortCombos(Array.from(columnMap.values())),
        matrix
    };
}

export function CanvasStudio({ analysis }: CanvasStudioProps) {
    const initialState = useMemo(() => sanitizeStudioState(null), []);
    const [tables, setTables] = useState<PivotTableInstance[]>(initialState.tables);
    const [activeTableId, setActiveTableId] = useState<string | null>(initialState.activeTableId);
    const [lastActiveTableId, setLastActiveTableId] = useState<string | null>(initialState.activeTableId);
    const [dragZone, setDragZone] = useState<PivotZoneId | null>(null);
    const [activeDrag, setActiveDrag] = useState<DragState | null>(null);
    const [dropIndicator, setDropIndicator] = useState<{ zoneId: PivotZoneId; index: number } | null>(null);
    const [openHeaderFilter, setOpenHeaderFilter] = useState<HeaderFilterState | null>(null);
    const [headerFilterSelections, setHeaderFilterSelections] = useState<Record<string, string[]>>({});
    const [headerFilterSortDirections, setHeaderFilterSortDirections] = useState<
        Record<string, HeaderFilterSortDirection>
    >({});
    const [isTableListOpen, setIsTableListOpen] = useState(false);
    const [openHeaderColorTableId, setOpenHeaderColorTableId] = useState<string | null>(null);
    const [editingTableId, setEditingTableId] = useState<string | null>(null);
    const [tableNameDraft, setTableNameDraft] = useState("");
    const [movingTableId, setMovingTableId] = useState<string | null>(null);
    const [resizingTableId, setResizingTableId] = useState<string | null>(null);
    const editingTableInputRef = useRef<HTMLInputElement | null>(null);
    const tableCanvasRef = useRef<HTMLDivElement | null>(null);
    const tableListButtonRef = useRef<HTMLButtonElement | null>(null);
    const tableListPanelRef = useRef<HTMLDivElement | null>(null);
    const headerFilterButtonRef = useRef<HTMLButtonElement | null>(null);
    const headerFilterPanelRef = useRef<HTMLDivElement | null>(null);
    const headerColorPaletteRef = useRef<HTMLDivElement | null>(null);
    const tableElementRefs = useRef<Record<string, HTMLTableElement | null>>({});
    const moveStateRef = useRef<MoveState | null>(null);
    const resizeStateRef = useRef<ResizeState | null>(null);
    const emptyHeaderText = useTypewriter(["Table Editor"]);

    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return;
            }

            const nextState = sanitizeStudioState(JSON.parse(raw));
            setTables(nextState.tables);
            setActiveTableId(nextState.activeTableId);
        } catch {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    }, []);

    useEffect(() => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                tables,
                activeTableId
            })
        );
    }, [activeTableId, tables]);

    useEffect(() => {
        if (!editingTableId || !editingTableInputRef.current) {
            return;
        }

        const input = editingTableInputRef.current;
        input.focus();
        const textLength = input.value.length;
        input.setSelectionRange(textLength, textLength);
    }, [editingTableId]);

    useEffect(() => {
        function handlePointerDown(event: PointerEvent) {
            if (tableListButtonRef.current?.contains(event.target as Node)) {
                return;
            }

            if (tableListPanelRef.current?.contains(event.target as Node)) {
                return;
            }

            if (headerFilterButtonRef.current?.contains(event.target as Node)) {
                return;
            }

            if (headerFilterPanelRef.current?.contains(event.target as Node)) {
                return;
            }

            if (headerColorPaletteRef.current?.contains(event.target as Node)) {
                return;
            }

            setIsTableListOpen(false);
            setOpenHeaderFilter(null);
            setOpenHeaderColorTableId(null);
        }

        window.addEventListener("pointerdown", handlePointerDown);
        return () => window.removeEventListener("pointerdown", handlePointerDown);
    }, []);

    useEffect(() => {
        if (activeTableId) {
            setLastActiveTableId(activeTableId);
        }
    }, [activeTableId]);

    useEffect(() => {
        if (lastActiveTableId && !tables.some((table) => table.id === lastActiveTableId)) {
            setLastActiveTableId(tables[0]?.id ?? null);
        }
    }, [lastActiveTableId, tables]);

    useEffect(() => {
        if (openHeaderColorTableId && !tables.some((table) => table.id === openHeaderColorTableId)) {
            setOpenHeaderColorTableId(null);
        }
    }, [openHeaderColorTableId, tables]);

    useEffect(() => {
        if (!openHeaderFilter) {
            return;
        }

        const table = tables.find((currentTable) => currentTable.id === openHeaderFilter.tableId);
        if (!table) {
            setOpenHeaderFilter(null);
            return;
        }

        if (
            openHeaderFilter.kind === "row-field" &&
            (!openHeaderFilter.fieldId ||
                table.layout.rows[openHeaderFilter.rowIndex ?? -1] !== openHeaderFilter.fieldId)
        ) {
            setOpenHeaderFilter(null);
            return;
        }

        if (openHeaderFilter.kind === "column-group" && table.layout.columns.length === 0) {
            setOpenHeaderFilter(null);
            return;
        }

        if (openHeaderFilter.kind === "table-menu" && table.layout.values.length === 0) {
            setOpenHeaderFilter(null);
            return;
        }

        if (
            openHeaderFilter.kind === "value-field" &&
            (!openHeaderFilter.fieldId ||
                table.layout.columns.length > 0 ||
                !table.layout.values.includes(openHeaderFilter.fieldId))
        ) {
            setOpenHeaderFilter(null);
        }
    }, [openHeaderFilter, tables]);

    useLayoutEffect(() => {
        const canvas = tableCanvasRef.current;
        if (!canvas) {
            return;
        }

        setTables((current) => {
            let hasChanges = false;

            const nextTables = current.map((table) => {
                if (table.hasCustomizedSize || table.layout.values.length === 0) {
                    return table;
                }

                const tableElement = tableElementRefs.current[table.id];
                if (!tableElement) {
                    return table;
                }

                const availableWidth = Math.max(0, canvas.clientWidth - table.position.x);
                const availableHeight = Math.max(0, canvas.clientHeight - table.position.y);
                const contentHeight = Math.ceil(tableElement.getBoundingClientRect().height);
                const nextHeight = Math.min(contentHeight, DEFAULT_TABLE_HEIGHT, availableHeight);
                const needsVerticalScrollbar = contentHeight > nextHeight;
                const contentWidth = Math.ceil(tableElement.getBoundingClientRect().width);
                const nextWidth = Math.min(
                    contentWidth + (needsVerticalScrollbar ? AUTO_FIT_SCROLLBAR_GUTTER : 0),
                    availableWidth
                );

                if (nextWidth <= 0 || nextHeight <= 0) {
                    return table;
                }

                if (table.size.width === nextWidth && table.size.height === nextHeight) {
                    return table;
                }

                hasChanges = true;
                return {
                    ...table,
                    size: {
                        width: nextWidth,
                        height: nextHeight
                    }
                };
            });

            return hasChanges ? nextTables : current;
        });
    }, [analysis, tables]);

    useEffect(() => {
        function handlePointerMove(event: PointerEvent) {
            const canvas = tableCanvasRef.current;
            if (!canvas) {
                return;
            }

            const canvasRect = canvas.getBoundingClientRect();
            const moveState = moveStateRef.current;
            if (moveState) {
                const currentTable = tables.find((table) => table.id === moveState.tableId);
                if (!currentTable) {
                    return;
                }

                const deltaX = event.clientX - moveState.startPointerX;
                const deltaY = event.clientY - moveState.startPointerY;
                const nextX = Math.min(
                    Math.max(0, moveState.startX + deltaX),
                    Math.max(0, canvasRect.width - currentTable.size.width)
                );
                const nextY = Math.min(
                    Math.max(0, moveState.startY + deltaY),
                    Math.max(0, canvasRect.height - currentTable.size.height)
                );

                updateTable(moveState.tableId, (table) => ({
                    ...table,
                    position: {
                        x: nextX,
                        y: nextY
                    }
                }));
                return;
            }

            const resizeState = resizeStateRef.current;
            if (!resizeState) {
                return;
            }

            const deltaX = event.clientX - resizeState.startPointerX;
            const deltaY = event.clientY - resizeState.startPointerY;
            const startLeft = resizeState.startX;
            const startTop = resizeState.startY;
            const startRight = resizeState.startX + resizeState.startWidth;
            const startBottom = resizeState.startY + resizeState.startHeight;

            let nextLeft = startLeft;
            let nextTop = startTop;
            let nextRight = startRight;
            let nextBottom = startBottom;

            if (resizeState.direction.includes("e")) {
                nextRight = Math.min(
                    canvasRect.width,
                    Math.max(startLeft + MIN_TABLE_WIDTH, startRight + deltaX)
                );
            }

            if (resizeState.direction.includes("s")) {
                nextBottom = Math.min(
                    canvasRect.height,
                    Math.max(startTop + MIN_TABLE_HEIGHT, startBottom + deltaY)
                );
            }

            if (resizeState.direction.includes("w")) {
                nextLeft = Math.max(0, Math.min(startRight - MIN_TABLE_WIDTH, startLeft + deltaX));
            }

            if (resizeState.direction.includes("n")) {
                nextTop = Math.max(0, Math.min(startBottom - MIN_TABLE_HEIGHT, startTop + deltaY));
            }

            updateTable(resizeState.tableId, (table) => ({
                ...table,
                hasCustomizedSize: true,
                position: {
                    x: nextLeft,
                    y: nextTop
                },
                size: {
                    width: nextRight - nextLeft,
                    height: nextBottom - nextTop
                }
            }));
        }

        function handlePointerUp() {
            moveStateRef.current = null;
            setMovingTableId(null);
            resizeStateRef.current = null;
            setResizingTableId(null);
        }

        window.addEventListener("pointermove", handlePointerMove);
        window.addEventListener("pointerup", handlePointerUp);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            window.removeEventListener("pointerup", handlePointerUp);
        };
    }, [tables]);

    const records = analysis?.records ?? [];

    const activeTable = useMemo(
        () =>
            activeTableId
                ? tables.find((table) => table.id === activeTableId) ?? null
                : null,
        [activeTableId, tables]
    );

    useEffect(() => {
        if (activeTableId && !tables.some((table) => table.id === activeTableId)) {
            setActiveTableId(null);
        }
    }, [activeTableId, tables]);

    const tableViews = useMemo<PivotTableView[]>(
        () =>
            tables.map((table) => {
                const filterOptions = buildFilterOptions(records, table.layout.filters);
                const filteredRecords = applyFilters(records, table.layout, table.filterSelections);
                const pivotResult = buildPivotResult(filteredRecords, table.layout);
                const hasColumnGroups = table.layout.columns.length > 0;
                const hasMultipleValueFields = pivotResult.valueFields.length > 1;

                return {
                    table,
                    filterOptions,
                    filteredRecords,
                    pivotResult,
                    hasColumnGroups,
                    hasMultipleValueFields,
                    showSecondaryHeaderRow: hasColumnGroups && hasMultipleValueFields
                };
            }),
        [records, tables]
    );

    const activeLayout = activeTable?.layout ?? DEFAULT_LAYOUT;
    const visibleTableViews = tableViews.filter((view) => view.table.layout.values.length > 0);
    const activeTableView =
        activeTableId ? tableViews.find((view) => view.table.id === activeTableId) ?? null : null;
    const headerTableName = activeTable?.layout.values.length ? activeTable.name : "";
    const activeTableHeaderColor = resolveTableHeaderColor(activeTable?.headerColor);
    const actionBarNameWidth = getActionBarNameWidth(
        activeTable && editingTableId === activeTable.id ? tableNameDraft || headerTableName : headerTableName
    );

    function updateTable(tableId: string, updater: (table: PivotTableInstance) => PivotTableInstance) {
        setTables((current) =>
            current.map((table) => (table.id === tableId ? updater(table) : table))
        );
    }

    function updateTableHeaderColor(tableId: string, headerColor: string) {
        updateTable(tableId, (table) => ({
            ...table,
            headerColor
        }));
    }

    function getDropTargetTable() {
        if (activeTable) {
            return activeTable;
        }

        if (lastActiveTableId) {
            const lastActiveTable = tables.find((table) => table.id === lastActiveTableId);
            if (lastActiveTable) {
                return lastActiveTable;
            }
        }

        return tables[0] ?? null;
    }

    function updateActiveTable(updater: (table: PivotTableInstance) => PivotTableInstance) {
        if (!activeTable) {
            return;
        }

        updateTable(activeTable.id, updater);
    }

    function addTable() {
        const nextTable = createPivotTable(tables.length + 1);
        setTables((current) => [...current, nextTable]);
        setActiveTableId(nextTable.id);
        setOpenHeaderFilter(null);
        setOpenHeaderColorTableId(null);
        setIsTableListOpen(false);
    }

    function deleteTable(tableId: string) {
        const currentIndex = tables.findIndex((table) => table.id === tableId);
        if (currentIndex === -1) {
            return;
        }

        const remainingTables = tables.filter((table) => table.id !== tableId);

        if (remainingTables.length === 0) {
            const fallbackTable = createPivotTable(1);
            setTables([fallbackTable]);
            setActiveTableId(fallbackTable.id);
            setLastActiveTableId(fallbackTable.id);
            setOpenHeaderFilter(null);
            setOpenHeaderColorTableId(null);
            setHeaderFilterSelections((current) =>
                Object.fromEntries(
                    Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`))
                )
            );
            setHeaderFilterSortDirections((current) =>
                Object.fromEntries(
                    Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`))
                )
            );
            setIsTableListOpen(false);
            cancelTableRename();
            return;
        }

        const nextActiveTable = remainingTables[Math.min(currentIndex, remainingTables.length - 1)];

        setTables(remainingTables);
        setActiveTableId((currentActiveTableId) =>
            currentActiveTableId === tableId || !remainingTables.some((table) => table.id === currentActiveTableId)
                ? nextActiveTable.id
                : currentActiveTableId
        );
        setLastActiveTableId(nextActiveTable.id);
        setOpenHeaderFilter((currentOpenHeaderFilter) =>
            currentOpenHeaderFilter?.tableId === tableId ? null : currentOpenHeaderFilter
        );
        setOpenHeaderColorTableId((currentOpenHeaderColorTableId) =>
            currentOpenHeaderColorTableId === tableId ? null : currentOpenHeaderColorTableId
        );
        setHeaderFilterSelections((current) =>
            Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`)))
        );
        setHeaderFilterSortDirections((current) =>
            Object.fromEntries(Object.entries(current).filter(([key]) => !key.startsWith(`${tableId}:`)))
        );
        setIsTableListOpen((currentOpenState) =>
            currentOpenState && remainingTables.some((table) => table.layout.values.length > 0) ? currentOpenState : false
        );

        if (editingTableId === tableId) {
            cancelTableRename();
        }
    }

    function removeFieldFromZone(fieldId: PivotFieldId, zoneId: PivotZoneId) {
        updateActiveTable((table) => ({
            ...table,
            layout: {
                ...table.layout,
                [zoneId]: table.layout[zoneId].filter((item) => item !== fieldId)
            }
        }));
    }

    function insertFieldIntoZone(fieldId: PivotFieldId, zoneId: PivotZoneId, targetIndex: number) {
        const targetTable = getDropTargetTable();
        if (!targetTable) {
            return;
        }

        if (activeTableId !== targetTable.id) {
            setActiveTableId(targetTable.id);
        }

        updateTable(targetTable.id, (table) => {
            const nextLayout = {
                filters: table.layout.filters.filter((item) => item !== fieldId),
                columns: table.layout.columns.filter((item) => item !== fieldId),
                rows: table.layout.rows.filter((item) => item !== fieldId),
                values: table.layout.values.filter((item) => item !== fieldId)
            };
            const nextZoneFields = [...nextLayout[zoneId]];
            const boundedIndex = Math.max(0, Math.min(targetIndex, nextZoneFields.length));
            nextZoneFields.splice(boundedIndex, 0, fieldId);
            nextLayout[zoneId] = nextZoneFields;

            return {
                ...table,
                layout: nextLayout
            };
        });
    }

    function resetActiveTable() {
        if (!activeTable) {
            return;
        }

        updateActiveTable((table) => ({
            ...table,
            layout: DEFAULT_LAYOUT,
            filterSelections: {}
        }));
        setOpenHeaderFilter(null);
        setHeaderFilterSelections((current) =>
            Object.fromEntries(
                Object.entries(current).filter(([key]) => !key.startsWith(`${activeTable.id}:`))
            )
        );
        setHeaderFilterSortDirections((current) =>
            Object.fromEntries(
                Object.entries(current).filter(([key]) => !key.startsWith(`${activeTable.id}:`))
            )
        );
        setOpenHeaderColorTableId(null);
    }

    function updateTableFilterSelection(tableId: string, fieldId: PivotFieldId, value: string) {
        updateTable(tableId, (table) => ({
            ...table,
            filterSelections: {
                ...table.filterSelections,
                [fieldId]: value
            }
        }));
    }

    function startTableRename(tableId: string) {
        const currentTable = tables.find((table) => table.id === tableId);
        if (!currentTable) {
            return;
        }

        setActiveTableId(tableId);
        setIsTableListOpen(false);
        setOpenHeaderFilter(null);
        setOpenHeaderColorTableId(null);
        setEditingTableId(tableId);
        setTableNameDraft(currentTable.name);
    }

    function cancelTableRename() {
        setEditingTableId(null);
        setTableNameDraft("");
    }

    function commitTableRename() {
        if (!editingTableId) {
            return;
        }

        const nextName = tableNameDraft.trim();
        if (nextName) {
            updateTable(editingTableId, (table) => ({
                ...table,
                name: nextName
            }));
        }

        cancelTableRename();
    }

    function clearTableSelection() {
        setActiveTableId(null);
        setOpenHeaderFilter(null);
        setOpenHeaderColorTableId(null);
        setIsTableListOpen(false);
        cancelTableRename();
    }

    function startTableMove(tableId: string, event: ReactPointerEvent<HTMLDivElement>) {
        if (editingTableId || resizingTableId) {
            return;
        }

        const currentTable = tables.find((table) => table.id === tableId);
        if (!currentTable) {
            return;
        }

        event.preventDefault();
        setActiveTableId(tableId);
        setMovingTableId(tableId);
        moveStateRef.current = {
            tableId,
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startX: currentTable.position.x,
            startY: currentTable.position.y
        };
    }

    function handleTablePointerDown(tableId: string, event: ReactPointerEvent<HTMLDivElement>) {
        const target = event.target as HTMLElement;
        if (
            target.closest("[data-no-table-drag='true']") ||
            target.closest("[data-table-resize-handle='true']")
        ) {
            return;
        }

        if (activeTableId !== tableId) {
            setActiveTableId(tableId);
            return;
        }

        startTableMove(tableId, event);
    }

    function startTableResize(
        tableId: string,
        direction: TableResizeDirection,
        event: ReactPointerEvent<HTMLButtonElement>
    ) {
        const currentTable = tables.find((table) => table.id === tableId);
        if (!currentTable) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();
        moveStateRef.current = null;
        setMovingTableId(null);
        setActiveTableId(tableId);
        setResizingTableId(tableId);
        resizeStateRef.current = {
            tableId,
            direction,
            startPointerX: event.clientX,
            startPointerY: event.clientY,
            startX: currentTable.position.x,
            startY: currentTable.position.y,
            startWidth: currentTable.size.width,
            startHeight: currentTable.size.height
        };
    }

    function clearDragState() {
        setActiveDrag(null);
        setDragZone(null);
        setDropIndicator(null);
    }

    function handleZoneDrop(zoneId: PivotZoneId, event: DragEvent<HTMLDivElement>) {
        event.preventDefault();
        const targetTable = getDropTargetTable();
        if (!targetTable) {
            clearDragState();
            return;
        }

        const fieldId = (activeDrag?.fieldId ??
            event.dataTransfer.getData("text/stockpilot-field")) as PivotFieldId;

        if (PIVOT_FIELDS.some((field) => field.id === fieldId)) {
            const targetIndex =
                dropIndicator?.zoneId === zoneId ? dropIndicator.index : targetTable.layout[zoneId].length;
            insertFieldIntoZone(fieldId, zoneId, targetIndex);
        }

        clearDragState();
    }

    function renderCell(view: PivotTableView, rowKey: string, columnKey: string, fieldId: PivotFieldId) {
        const rowBucket = view.pivotResult.matrix.get(rowKey);
        const cell = rowBucket?.get(columnKey);
        const state = cell?.[fieldId];
        return formatAggregatedValue(fieldId, resolveAggregationValue(fieldId, state));
    }

    function getHeaderFilterStateKey(
        tableId: string,
        kind: HeaderFilterKind,
        fieldId?: PivotFieldId,
        rowIndex?: number
    ) {
        if (kind === "row-field") {
            return `${tableId}:${kind}:${fieldId}:${rowIndex}`;
        }

        if (kind === "value-field") {
            return `${tableId}:${kind}:${fieldId}`;
        }

        return `${tableId}:${kind}`;
    }

    function parseSortableNumber(value: string) {
        const normalizedValue = value.trim().replace(/,/g, "").replace(/%$/g, "");
        if (!/^[+-]?\d+(\.\d+)?$/.test(normalizedValue)) {
            return null;
        }

        const parsedValue = Number.parseFloat(normalizedValue);
        return Number.isFinite(parsedValue) ? parsedValue : null;
    }

    function parseSortableDate(value: string) {
        if (!/[/-]/.test(value)) {
            return null;
        }

        const parsedValue = Date.parse(value);
        return Number.isNaN(parsedValue) ? null : parsedValue;
    }

    function compareSortableValues(left: string, right: string) {
        const leftNumber = parseSortableNumber(left);
        const rightNumber = parseSortableNumber(right);

        if (leftNumber !== null && rightNumber !== null) {
            return leftNumber - rightNumber;
        }

        const leftDate = parseSortableDate(left);
        const rightDate = parseSortableDate(right);

        if (leftDate !== null && rightDate !== null) {
            return leftDate - rightDate;
        }

        return left.localeCompare(right, undefined, {
            numeric: true,
            sensitivity: "base"
        });
    }

    function sortByDirection(value: number, direction: HeaderFilterSortDirection) {
        return direction === "asc" ? value : value * -1;
    }

    function getHeaderFilterSelectedValues(
        tableId: string,
        kind: HeaderFilterKind,
        allValues: string[],
        fieldId?: PivotFieldId,
        rowIndex?: number
    ) {
        const selectionKey = getHeaderFilterStateKey(tableId, kind, fieldId, rowIndex);
        const currentValues = headerFilterSelections[selectionKey];
        if (!currentValues) {
            return allValues;
        }

        const allowedValues = new Set(allValues);
        return currentValues.filter((value) => allowedValues.has(value));
    }

    function updateHeaderFilterSelection(
        tableId: string,
        kind: HeaderFilterKind,
        nextValues: string[],
        allValues: string[],
        fieldId?: PivotFieldId,
        rowIndex?: number
    ) {
        const selectionKey = getHeaderFilterStateKey(tableId, kind, fieldId, rowIndex);
        const allowedValues = new Set(allValues);
        const normalizedValues = Array.from(new Set(nextValues)).filter((value) => allowedValues.has(value));

        setHeaderFilterSelections((current) => {
            if (normalizedValues.length === allValues.length) {
                const nextSelections = { ...current };
                delete nextSelections[selectionKey];
                return nextSelections;
            }

            return {
                ...current,
                [selectionKey]: normalizedValues
            };
        });
    }

    function getHeaderFilterSortDirection(
        tableId: string,
        kind: HeaderFilterKind,
        fieldId?: PivotFieldId,
        rowIndex?: number
    ) {
        return (
            headerFilterSortDirections[getHeaderFilterStateKey(tableId, kind, fieldId, rowIndex)] ?? "asc"
        );
    }

    function toggleHeaderFilterSortDirection(
        tableId: string,
        kind: HeaderFilterKind,
        fieldId?: PivotFieldId,
        rowIndex?: number
    ) {
        const stateKey = getHeaderFilterStateKey(tableId, kind, fieldId, rowIndex);
        setHeaderFilterSortDirections((current) => ({
            ...current,
            [stateKey]: current[stateKey] === "desc" ? "asc" : "desc"
        }));
    }

    function sortHeaderFilterOptions(
        options: HeaderFilterOption[],
        direction: HeaderFilterSortDirection
    ) {
        return [...options].sort((left, right) =>
            sortByDirection(compareSortableValues(left.label, right.label), direction)
        );
    }

    function getRowFieldFilterOptions(
        view: PivotTableView,
        fieldId: PivotFieldId,
        rowIndex: number
    ) {
        const options = Array.from(new Set(view.pivotResult.rowCombos.map((combo) => combo.labels[rowIndex]))).map(
            (value) => ({
                label: value,
                value
            })
        );

        return sortHeaderFilterOptions(
            options,
            getHeaderFilterSortDirection(view.table.id, "row-field", fieldId, rowIndex)
        );
    }

    function getColumnGroupFilterOptions(view: PivotTableView) {
        return sortHeaderFilterOptions(
            view.pivotResult.columnCombos.map((combo) => ({
                label: combo.labels.join(" / "),
                value: combo.key
            })),
            getHeaderFilterSortDirection(view.table.id, "column-group")
        );
    }

    function getValueFieldFilterOptions(view: PivotTableView, fieldId: PivotFieldId) {
        const options = Array.from(
            new Set(
                view.pivotResult.rowCombos.map((rowCombo) => renderCell(view, rowCombo.key, "__total__", fieldId))
            )
        ).map((value) => ({
            label: value,
            value
        }));

        return sortHeaderFilterOptions(
            options,
            getHeaderFilterSortDirection(view.table.id, "value-field", fieldId)
        );
    }

    function getVisibleColumnCombos(view: PivotTableView) {
        if (!view.hasColumnGroups) {
            return view.pivotResult.columnCombos;
        }

        const options = getColumnGroupFilterOptions(view);
        const selectedValues = new Set(
            getHeaderFilterSelectedValues(
                view.table.id,
                "column-group",
                options.map((option) => option.value)
            )
        );
        const sortDirection = getHeaderFilterSortDirection(view.table.id, "column-group");

        return [...view.pivotResult.columnCombos]
            .filter((combo) => selectedValues.has(combo.key))
            .sort((left, right) =>
                sortByDirection(
                    compareSortableValues(left.labels.join(" / "), right.labels.join(" / ")),
                    sortDirection
                )
            );
    }

    function getVisibleRowCombos(view: PivotTableView) {
        const filteredRowCombos = view.pivotResult.rowCombos.filter((rowCombo) => {
            const rowFieldSelectionPasses = view.table.layout.rows.every((fieldId, rowIndex) => {
                const options = getRowFieldFilterOptions(view, fieldId, rowIndex);
                const selectedValues = new Set(
                    getHeaderFilterSelectedValues(
                        view.table.id,
                        "row-field",
                        options.map((option) => option.value),
                        fieldId,
                        rowIndex
                    )
                );

                return selectedValues.has(rowCombo.labels[rowIndex]);
            });

            if (!rowFieldSelectionPasses) {
                return false;
            }

            if (view.hasColumnGroups) {
                return true;
            }

            return view.pivotResult.valueFields.every((fieldId) => {
                const options = getValueFieldFilterOptions(view, fieldId);
                const selectedValues = new Set(
                    getHeaderFilterSelectedValues(
                        view.table.id,
                        "value-field",
                        options.map((option) => option.value),
                        fieldId
                    )
                );

                return selectedValues.has(renderCell(view, rowCombo.key, "__total__", fieldId));
            });
        });

        const explicitValueSortFieldId =
            !view.hasColumnGroups
                ? view.pivotResult.valueFields.find((fieldId) =>
                      Object.prototype.hasOwnProperty.call(
                          headerFilterSortDirections,
                          getHeaderFilterStateKey(view.table.id, "value-field", fieldId)
                      )
                  )
                : undefined;

        return [...filteredRowCombos].sort((left, right) => {
            if (explicitValueSortFieldId) {
                const sortDirection = getHeaderFilterSortDirection(
                    view.table.id,
                    "value-field",
                    explicitValueSortFieldId
                );
                const comparison = compareSortableValues(
                    renderCell(view, left.key, "__total__", explicitValueSortFieldId),
                    renderCell(view, right.key, "__total__", explicitValueSortFieldId)
                );

                if (comparison !== 0) {
                    return sortByDirection(comparison, sortDirection);
                }
            }

            for (const [rowIndex, fieldId] of view.table.layout.rows.entries()) {
                const comparison = compareSortableValues(left.labels[rowIndex], right.labels[rowIndex]);
                if (comparison !== 0) {
                    return sortByDirection(
                        comparison,
                        getHeaderFilterSortDirection(view.table.id, "row-field", fieldId, rowIndex)
                    );
                }
            }

            return 0;
        });
    }

    function renderRowTotal(
        view: PivotTableView,
        rowKey: string,
        fieldId: PivotFieldId,
        columnCombos: PivotCombo[]
    ) {
        const mergedState = columnCombos.reduce<AggregationState>(
            (accumulator, combo) => {
                const state = view.pivotResult.matrix.get(rowKey)?.get(combo.key)?.[fieldId];
                accumulator.sum += state?.sum ?? 0;
                accumulator.count += state?.count ?? 0;
                return accumulator;
            },
            { sum: 0, count: 0 }
        );

        return formatAggregatedValue(fieldId, resolveAggregationValue(fieldId, mergedState));
    }

    function renderColumnTotal(
        view: PivotTableView,
        columnKey: string,
        fieldId: PivotFieldId,
        rowCombos: PivotCombo[]
    ) {
        const mergedState = rowCombos.reduce<AggregationState>(
            (accumulator, rowCombo) => {
                const state = view.pivotResult.matrix.get(rowCombo.key)?.get(columnKey)?.[fieldId];
                accumulator.sum += state?.sum ?? 0;
                accumulator.count += state?.count ?? 0;
                return accumulator;
            },
            { sum: 0, count: 0 }
        );

        return formatAggregatedValue(fieldId, resolveAggregationValue(fieldId, mergedState));
    }

    function renderGrandTotal(
        view: PivotTableView,
        fieldId: PivotFieldId,
        rowCombos: PivotCombo[],
        columnCombos: PivotCombo[]
    ) {
        const mergedState = rowCombos.reduce<AggregationState>(
            (accumulator, rowCombo) => {
                for (const combo of columnCombos) {
                    const state = view.pivotResult.matrix.get(rowCombo.key)?.get(combo.key)?.[fieldId];
                    accumulator.sum += state?.sum ?? 0;
                    accumulator.count += state?.count ?? 0;
                }

                return accumulator;
            },
            { sum: 0, count: 0 }
        );

        return formatAggregatedValue(fieldId, resolveAggregationValue(fieldId, mergedState));
    }

    function renderHeaderFilterMenu(view: PivotTableView) {
        if (
            !openHeaderFilter ||
            openHeaderFilter.tableId !== view.table.id ||
            openHeaderFilter.kind !== "table-menu"
        ) {
            return null;
        }

        const sections: Array<{
            key: string;
            title: string;
            kind: Exclude<HeaderFilterKind, "table-menu">;
            options: HeaderFilterOption[];
            fieldId?: PivotFieldId;
            rowIndex?: number;
        }> = [
            ...view.table.layout.rows.map((fieldId, rowIndex) => ({
                key: `row-field:${fieldId}:${rowIndex}`,
                title: getFieldDefinition(fieldId).label,
                kind: "row-field" as const,
                options: getRowFieldFilterOptions(view, fieldId, rowIndex),
                fieldId,
                rowIndex
            })),
            ...(view.hasColumnGroups
                ? [
                      {
                          key: "column-group",
                          title: view.table.layout.columns
                              .map((fieldId) => getFieldDefinition(fieldId).label)
                              .join(" / "),
                          kind: "column-group" as const,
                          options: getColumnGroupFilterOptions(view)
                      }
                  ]
                : view.pivotResult.valueFields.map((fieldId) => ({
                      key: `value-field:${fieldId}`,
                      title: getFieldDefinition(fieldId).label,
                      kind: "value-field" as const,
                      options: getValueFieldFilterOptions(view, fieldId),
                      fieldId
                  })))
        ].filter((section) => section.options.length > 0);

        function renderCheckboxSection(
            title: string,
            kind: Exclude<HeaderFilterKind, "table-menu">,
            options: HeaderFilterOption[],
            fieldId?: PivotFieldId,
            rowIndex?: number
        ) {
            const optionValues = options.map((option) => option.value);
            const selectedValues = getHeaderFilterSelectedValues(
                view.table.id,
                kind,
                optionValues,
                fieldId,
                rowIndex
            );
            const selectedValueSet = new Set(selectedValues);
            const sortDirection = getHeaderFilterSortDirection(view.table.id, kind, fieldId, rowIndex);
            const allSelected = selectedValues.length === optionValues.length;

            return (
                <div className="overflow-hidden rounded-[8px] border border-slate-200 bg-white">
                    <div className="flex min-w-0 items-center gap-2 px-3 py-1">
                        <span className="min-w-0 flex-1 truncate pl-px text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                            {title}
                        </span>
                        <button
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                toggleHeaderFilterSortDirection(view.table.id, kind, fieldId, rowIndex);
                            }}
                            className="inline-flex h-5 w-5 shrink-0 items-center justify-center text-slate-500 transition hover:text-[#080a0f]"
                            aria-label={`Sort ${title}`}
                        >
                            {sortDirection === "asc" ? (
                                <ArrowUpAZ className="h-4 w-4" strokeWidth={1.8} />
                            ) : (
                                <ArrowUpZA className="h-4 w-4" strokeWidth={1.8} />
                            )}
                        </button>
                    </div>

                    <label className="flex cursor-pointer items-center gap-2 px-3 py-1 transition hover:bg-slate-50">
                        <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={() =>
                                updateHeaderFilterSelection(
                                    view.table.id,
                                    kind,
                                    allSelected ? [] : optionValues,
                                    optionValues,
                                    fieldId,
                                    rowIndex
                                )
                            }
                            className="h-3.5 w-3.5 rounded border-slate-300 accent-[#080a0f] focus:ring-0"
                        />
                        <span className="truncate font-display text-[0.84rem] font-light leading-[1.08] tracking-tight text-ink">
                            All
                        </span>
                    </label>

                    <div className="max-h-[220px] overflow-y-auto">
                        {options.map((option) => (
                            <label
                                key={`${view.table.id}:${kind}:${option.value}`}
                                className="flex cursor-pointer items-center gap-2 px-3 py-1 transition hover:bg-slate-50"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedValueSet.has(option.value)}
                                    onChange={(event) => {
                                        const nextValues = new Set(selectedValues);
                                        if (event.target.checked) {
                                            nextValues.add(option.value);
                                        } else {
                                            nextValues.delete(option.value);
                                        }

                                        updateHeaderFilterSelection(
                                            view.table.id,
                                            kind,
                                            Array.from(nextValues),
                                            optionValues,
                                            fieldId,
                                            rowIndex
                                        );
                                    }}
                                    className="h-3.5 w-3.5 rounded border-slate-300 accent-[#080a0f] focus:ring-0"
                                />
                                <span className="truncate font-display text-[0.84rem] font-light leading-[1.08] tracking-tight text-ink">
                                    {option.label}
                                </span>
                            </label>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div
                ref={headerFilterPanelRef}
                className="absolute left-0 top-full z-[140] mt-[14px] isolate w-[265px] max-w-[420px] overflow-hidden rounded-[12px] border border-slate-200 bg-white p-1.5 shadow-[0_22px_48px_-28px_rgba(11,14,20,0.24)]"
                style={{ backgroundColor: "#ffffff", opacity: 1 }}
                onPointerDown={(event) => event.stopPropagation()}
            >
                {sections.length > 0 ? (
                    <div className="max-h-[440px] space-y-1 overflow-y-auto">
                        {sections.map((section) => (
                            <div key={`${view.table.id}:${section.key}`}>
                                {renderCheckboxSection(
                                    section.title,
                                    section.kind,
                                    section.options,
                                    section.fieldId,
                                    section.rowIndex
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-[8px] border border-slate-200 bg-white px-3 py-3 font-display text-[0.84rem] font-light leading-[1.08] tracking-tight text-slate-500">
                        No filterable fields
                    </div>
                )}
            </div>
        );
    }

    function renderHeaderFilterTrigger(view: PivotTableView) {
        const headerKey = `table-header-filter:${view.table.id}`;
        const isOpen =
            openHeaderFilter?.tableId === view.table.id &&
            openHeaderFilter.headerKey === headerKey &&
            openHeaderFilter.kind === "table-menu";
        const activeFilterCount = Object.keys(headerFilterSelections).filter((key) =>
            key.startsWith(`${view.table.id}:`)
        );
        const hasSelection = activeFilterCount.length > 0;
        const hasCustomSort = Object.keys(headerFilterSortDirections).some((key) =>
            key.startsWith(`${view.table.id}:`)
        );
        const filterCountLabel =
            activeFilterCount.length > 9 ? "9+" : String(activeFilterCount.length);

        return (
            <button
                ref={isOpen ? headerFilterButtonRef : null}
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setActiveTableId(view.table.id);
                    setIsTableListOpen(false);
                    setOpenHeaderColorTableId(null);
                    setOpenHeaderFilter((current) =>
                        current?.tableId === view.table.id &&
                        current.headerKey === headerKey &&
                        current.kind === "table-menu"
                            ? null
                            : {
                                  tableId: view.table.id,
                                  headerKey,
                                  kind: "table-menu"
                              }
                    );
                }}
                onPointerDown={(event) => event.stopPropagation()}
                className={`relative inline-flex shrink-0 items-center justify-center rounded-[10px] p-1 text-[#080a0f] transition ${
                    isOpen || hasSelection || hasCustomSort
                        ? "text-[#080a0f]"
                        : "text-[#080a0f]"
                }`}
                aria-label={`Filter ${view.table.name}`}
            >
                <SlidersHorizontal
                    className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                    strokeWidth={ACTION_BAR_ICON_STROKE}
                />
                {activeFilterCount.length > 0 ? (
                    <span className="absolute -right-1 -top-0.5 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-[#ef4444] px-[3px] text-center text-[8px] font-semibold leading-none text-white align-middle">
                        {filterCountLabel}
                    </span>
                ) : null}
            </button>
        );
    }

    return (
        <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
            <aside className="flex h-[940px] max-h-[940px] flex-col overflow-hidden rounded-[12px] border border-slate-200/70 bg-white/80 p-6 shadow-[0_32px_90px_-46px_rgba(11,14,20,0.34)] backdrop-blur-xl">
                <div className="flex min-h-0 flex-1 flex-col">
                    <div className="px-1">
                        <p className="pl-px text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Fields
                        </p>
                        <h3 className="mt-1 font-display text-[2rem] font-light leading-[1.08] tracking-tight text-ink">
                            Pivot field builder
                        </h3>
                    </div>

                    <div className="mt-4 min-h-0 flex-1">
                        <div className="h-full overflow-y-auto pr-1">
                            {PIVOT_FIELDS.map((field) => (
                                <button
                                    key={field.id}
                                    type="button"
                                    draggable
                                    onDragStart={(event) => {
                                        event.dataTransfer.setData("text/stockpilot-field", field.id);
                                        event.dataTransfer.effectAllowed = "move";
                                        setActiveDrag({
                                            fieldId: field.id,
                                            sourceZone: "fields"
                                        });
                                        setDropIndicator(null);
                                    }}
                                    onDragEnd={clearDragState}
                                    className="flex w-full items-start gap-2 border-b border-slate-200/70 px-1 py-1.5 text-left transition hover:border-brand/30 last:border-b-0"
                                >
                                    <Grip className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
                                    <div className="min-w-0 flex-1">
                                        <p className={`truncate ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}>
                                            {field.label}
                                        </p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mt-5 flex items-end justify-between gap-4">
                        <div className="px-1">
                            <p className="pl-px text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                                Layout
                            </p>
                            <h3 className="mt-1 font-display text-[2rem] font-light leading-[1.08] tracking-tight text-ink">
                                Drag and drop
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={resetActiveTable}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/60 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-slate-700 shadow-sm backdrop-blur transition-colors hover:bg-white/75 hover:text-ink"
                            >
                                Reset
                                <X className="h-4 w-4 text-red-500" />
                            </button>
                        </div>
                    </div>

                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        {PIVOT_ZONES.map((zone) => (
                            <div key={zone.id} className="flex flex-col">
                                <div className="mb-2 flex items-start gap-1.5 px-1">
                                    <div className="shrink-0 pt-0.5 text-ink">
                                        {zone.id === "filters" ? (
                                            <SlidersHorizontal className="h-5 w-5" strokeWidth={1.7} />
                                        ) : zone.id === "values" ? (
                                            <Diff className="h-5 w-5" strokeWidth={1.7} />
                                        ) : zone.id === "columns" ? (
                                            <BetweenVerticalStart className="h-5 w-5" strokeWidth={1.7} />
                                        ) : (
                                            <BetweenHorizontalStart className="h-5 w-5" strokeWidth={1.7} />
                                        )}
                                    </div>
                                    <div className="min-w-0">
                                        <p className="font-display text-[1.12rem] font-light leading-[1.08] tracking-tight text-ink">
                                            {zone.label}
                                        </p>
                                    </div>
                                </div>

                                <div
                                    onDragOver={(event) => {
                                        event.preventDefault();
                                        setDragZone(zone.id);
                                        setDropIndicator((current) =>
                                            current?.zoneId === zone.id
                                                ? current
                                                : {
                                                      zoneId: zone.id,
                                                      index: activeLayout[zone.id].length
                                                  }
                                        );
                                    }}
                                    onDrop={(event) => handleZoneDrop(zone.id, event)}
                                    className={`flex aspect-[4/5] min-h-0 flex-col overflow-hidden rounded-[10px] border px-3 pb-3 pt-2.5 shadow-[0_18px_42px_-34px_rgba(11,14,20,0.38)] transition ${
                                        dragZone === zone.id
                                            ? "border-slate-300 bg-white/80 backdrop-blur-xl"
                                            : "border-slate-200/70 bg-white/80 backdrop-blur-xl"
                                    }`}
                                >
                                    <div className="min-h-0 flex-1 space-y-0 overflow-y-auto pr-1">
                                        {activeLayout[zone.id].length === 0 ? (
                                            dropIndicator?.zoneId === zone.id ? (
                                                <motion.div
                                                    layout
                                                    className="my-1 h-7 rounded-[8px] border border-dashed border-slate-300 bg-slate-100/70"
                                                />
                                            ) : (
                                                <div className="h-0" />
                                            )
                                        ) : (
                                            activeLayout[zone.id].map((fieldId) => (
                                                <Fragment key={`${zone.id}:${fieldId}`}>
                                                    {dropIndicator?.zoneId === zone.id &&
                                                    dropIndicator.index === activeLayout[zone.id].indexOf(fieldId) ? (
                                                        <motion.div
                                                            layout
                                                            className="my-1 h-7 rounded-[8px] border border-dashed border-slate-300 bg-slate-100/70"
                                                        />
                                                    ) : null}

                                                    <motion.div
                                                        layout
                                                        transition={{
                                                            layout: {
                                                                duration: 0.2,
                                                                ease: [0.16, 1, 0.3, 1]
                                                            }
                                                        }}
                                                        draggable
                                                        onDragStart={(event) => {
                                                            const dataTransfer = (
                                                                event as unknown as DragEvent<HTMLDivElement>
                                                            ).dataTransfer;

                                                            if (!dataTransfer) {
                                                                return;
                                                            }
                                                            dataTransfer.setData("text/stockpilot-field", fieldId);
                                                            dataTransfer.effectAllowed = "move";
                                                            setActiveDrag({
                                                                fieldId,
                                                                sourceZone: zone.id
                                                            });
                                                        }}
                                                        onDragEnd={clearDragState}
                                                        onDragOver={(event) => {
                                                            event.preventDefault();
                                                            event.stopPropagation();
                                                            const bounds = event.currentTarget.getBoundingClientRect();
                                                            const nextIndex =
                                                                event.clientY < bounds.top + bounds.height / 2
                                                                    ? activeLayout[zone.id].indexOf(fieldId)
                                                                    : activeLayout[zone.id].indexOf(fieldId) + 1;
                                                            setDragZone(zone.id);
                                                            setDropIndicator((current) =>
                                                                current?.zoneId === zone.id &&
                                                                current.index === nextIndex
                                                                    ? current
                                                                    : {
                                                                          zoneId: zone.id,
                                                                          index: nextIndex
                                                                      }
                                                            );
                                                        }}
                                                        className={`flex items-center justify-between gap-3 border-b border-slate-200/70 py-1 text-sm text-slate-800 transition last:border-b-0 ${
                                                            activeDrag?.fieldId === fieldId &&
                                                            activeDrag.sourceZone === zone.id
                                                                ? "opacity-45"
                                                                : "opacity-100"
                                                        }`}
                                                    >
                                                        <div className="flex min-w-0 items-start gap-1.5">
                                                            <Grip className="mt-0.5 h-3 w-3 shrink-0 text-slate-500" />
                                                            <span className="truncate font-display text-[0.92rem] font-light leading-[1.08] tracking-tight text-ink">
                                                                {getFieldDefinition(fieldId).label}
                                                            </span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => removeFieldFromZone(fieldId, zone.id)}
                                                            className="rounded-full p-0.5 text-slate-500 transition hover:text-ink"
                                                            aria-label={`Remove ${getFieldDefinition(fieldId).label}`}
                                                        >
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </motion.div>

                                                    {dropIndicator?.zoneId === zone.id &&
                                                    dropIndicator.index === activeLayout[zone.id].length &&
                                                    fieldId === activeLayout[zone.id][activeLayout[zone.id].length - 1] ? (
                                                        <motion.div
                                                            layout
                                                            className="my-1 h-7 rounded-[8px] border border-dashed border-slate-300 bg-slate-100/70"
                                                        />
                                                    ) : null}
                                                </Fragment>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </aside>

            <section className="relative flex h-[940px] max-h-[940px] flex-col overflow-hidden rounded-[12px] border border-slate-200/70 bg-white/80 p-[10px] shadow-[0_32px_90px_-46px_rgba(11,14,20,0.34)] backdrop-blur-xl">
                <div className="canvas-studio-header premium-card-dark relative z-[90] h-11 overflow-visible" style={{ borderRadius: "14px" }}>
                    <div
                        className="absolute inset-y-0 right-0 w-[55%] overflow-hidden opacity-20 pointer-events-none"
                        style={{
                            WebkitMaskImage: "linear-gradient(to left, black 10%, transparent 90%)",
                            maskImage: "linear-gradient(to left, black 10%, transparent 90%)"
                        }}
                    >
                        <div className="story-grid-pattern" />
                    </div>

                    <div
                        className={`relative z-10 flex h-full min-w-0 items-center gap-4 px-4 ${
                            headerTableName ? "justify-between" : "justify-start"
                        }`}
                    >
                        {headerTableName ? (
                            <div className="flex min-w-0 flex-1 items-center justify-start">
                                <div className="relative z-[110] flex shrink-0 -translate-x-[10px] items-center">
                                    <div className="inline-flex min-w-0 shrink-0 items-center gap-0.5 rounded-[12px] bg-white px-1.5 py-[3px]">
                                        <div className="shrink-0" style={{ width: actionBarNameWidth }}>
                                            {activeTable && editingTableId === activeTable.id ? (
                                                <input
                                                    ref={editingTableInputRef}
                                                    value={tableNameDraft}
                                                    onChange={(event) => setTableNameDraft(event.target.value)}
                                                    onBlur={commitTableRename}
                                                    onKeyDown={(event) => {
                                                        if (event.key === "Enter") {
                                                            event.preventDefault();
                                                            commitTableRename();
                                                        }

                                                        if (event.key === "Escape") {
                                                            event.preventDefault();
                                                            cancelTableRename();
                                                        }
                                                    }}
                                                    className={`h-[30px] w-full rounded-[10px] bg-transparent px-3 py-1 ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-[#080a0f] outline-none placeholder:text-slate-400`}
                                                />
                                            ) : (
                                                <button
                                                    ref={tableListButtonRef}
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenHeaderColorTableId(null);
                                                        setOpenHeaderFilter(null);
                                                        setIsTableListOpen((current) => !current);
                                                    }}
                                                    className="inline-flex h-[30px] w-full min-w-0 items-center justify-between gap-2 rounded-[10px] px-3 py-1 text-left text-[#080a0f] transition hover:bg-slate-100"
                                                    aria-haspopup="menu"
                                                    aria-expanded={isTableListOpen}
                                                    aria-label="Open table list"
                                                >
                                                    <span className={`truncate ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-[#080a0f]`}>
                                                        {headerTableName}
                                                    </span>
                                                    <ChevronDown
                                                        className={`${ACTION_BAR_ICON_CLASS} shrink-0 text-slate-500 transition ${
                                                            isTableListOpen ? "rotate-180" : ""
                                                        }`}
                                                        strokeWidth={ACTION_BAR_ICON_STROKE}
                                                    />
                                                </button>
                                            )}
                                        </div>
                                        {activeTable ? (
                                            <div
                                                ref={openHeaderColorTableId === activeTable.id ? headerColorPaletteRef : null}
                                                className="inline-flex shrink-0 items-center gap-1"
                                            >
                                                <button
                                                    type="button"
                                                    onClick={(event) => {
                                                        event.stopPropagation();
                                                        setActiveTableId(activeTable.id);
                                                        setIsTableListOpen(false);
                                                        setOpenHeaderFilter(null);
                                                        setOpenHeaderColorTableId((current) =>
                                                            current === activeTable.id ? null : activeTable.id
                                                        );
                                                    }}
                                                    className="inline-flex shrink-0 items-center rounded-[10px] p-1 text-[#080a0f] transition"
                                                    aria-label={`Change ${activeTable.name} header color`}
                                                >
                                                    <Palette
                                                        className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                                                        strokeWidth={ACTION_BAR_ICON_STROKE}
                                                    />
                                                </button>

                                                {openHeaderColorTableId === activeTable.id ? (
                                                    <div className="inline-flex shrink-0 items-center gap-1 pr-0.5">
                                                        {TABLE_HEADER_COLOR_OPTIONS.map((color) => {
                                                            const isSelected = activeTableHeaderColor === color;

                                                            return (
                                                                <button
                                                                    key={`header-color:${activeTable.id}:${color}`}
                                                                    type="button"
                                                                    onClick={(event) => {
                                                                        event.stopPropagation();
                                                                        updateTableHeaderColor(activeTable.id, color);
                                                                    }}
                                                                    className="inline-flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full transition"
                                                                    style={{ backgroundColor: color }}
                                                                    aria-label={`Set ${activeTable.name} header color to ${color}`}
                                                                >
                                                                    {isSelected ? (
                                                                        <Check
                                                                            className="h-[10px] w-[10px] text-white"
                                                                            strokeWidth={2.6}
                                                                        />
                                                                    ) : null}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                ) : null}
                                            </div>
                                        ) : null}
                                        {activeTableView ? renderHeaderFilterTrigger(activeTableView) : null}
                                        {activeTable ? (
                                            <button
                                            type="button"
                                            onClick={() => deleteTable(activeTable.id)}
                                            className="inline-flex shrink-0 items-center rounded-[10px] p-1 text-[#080a0f] transition"
                                            aria-label={`Delete ${activeTable.name}`}
                                        >
                                            <X
                                                className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                                                strokeWidth={ACTION_BAR_ICON_STROKE}
                                            />
                                        </button>
                                    ) : null}
                                        <button
                                            type="button"
                                            onClick={addTable}
                                            className="inline-flex shrink-0 items-center rounded-[10px] p-1 text-[#080a0f] transition"
                                            aria-label="Create new table"
                                        >
                                        <Plus
                                            className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                                            strokeWidth={ACTION_BAR_ICON_STROKE}
                                        />
                                    </button>
                                        {activeTable ? (
                                            <button
                                                type="button"
                                                onClick={() => startTableRename(activeTable.id)}
                                                className="inline-flex shrink-0 items-center justify-center rounded-[10px] p-1 text-[#080a0f] transition"
                                                aria-label={`Rename ${activeTable.name}`}
                                            >
                                                <SquarePen
                                                    className={`${ACTION_BAR_ICON_CLASS} text-[#080a0f]`}
                                                    strokeWidth={ACTION_BAR_ICON_STROKE}
                                                />
                                            </button>
                                        ) : null}
                                    </div>

                                    {headerTableName && isTableListOpen ? (
                                        <div
                                            ref={tableListPanelRef}
                                            className="absolute left-0 right-0 top-full z-[140] mt-1 isolate overflow-hidden rounded-[14px] border border-slate-200 bg-white p-1.5 shadow-[0_22px_48px_-28px_rgba(11,14,20,0.24)]"
                                            style={{ backgroundColor: "#ffffff", opacity: 1 }}
                                            onPointerDown={(event) => event.stopPropagation()}
                                        >
                                            {visibleTableViews.map((view) => (
                                                <div
                                                    key={`header-table-option:${view.table.id}`}
                                                    className={`mb-0.5 flex items-center gap-1 rounded-[10px] last:mb-0 ${
                                                        view.table.id === activeTableId ? "bg-slate-100" : "bg-transparent"
                                                    }`}
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setActiveTableId(view.table.id);
                                                            setLastActiveTableId(view.table.id);
                                                            setOpenHeaderColorTableId(null);
                                                            setIsTableListOpen(false);
                                                        }}
                                                        className="flex h-[30px] min-w-0 flex-1 items-center rounded-[10px] px-3 py-1 text-left text-[#080a0f] transition hover:bg-slate-100"
                                                    >
                                                        <span className={`truncate ${PIVOT_FIELD_TEXT_TYPOGRAPHY}`}>
                                                            {view.table.name}
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            deleteTable(view.table.id);
                                                        }}
                                                        className="inline-flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[10px] text-[#080a0f] transition hover:bg-slate-100"
                                                        aria-label={`Delete ${view.table.name}`}
                                                    >
                                                        <X className="h-4 w-4" strokeWidth={1.95} />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                    {activeTableView &&
                                    openHeaderFilter?.tableId === activeTableView.table.id &&
                                    openHeaderFilter.kind === "table-menu"
                                        ? renderHeaderFilterMenu(activeTableView)
                                        : null}
                                </div>
                            </div>
                        ) : (
                            <span
                                className="inline-flex h-full max-w-full items-center"
                                style={{ paddingBottom: 0 }}
                            >
                                <span
                                    className="text-gradient truncate font-display text-[1.16rem] font-bold leading-none tracking-tight"
                                    style={{ paddingBottom: 0 }}
                                >
                                    {emptyHeaderText}
                                </span>
                            </span>
                        )}
                    </div>
                </div>

                {!analysis ? (
                    <div className="mt-3 min-h-0 flex-1" />
                ) : visibleTableViews.length === 0 ? (
                    <div className="relative mt-3 flex min-h-0 flex-1 overflow-hidden rounded-none">
                        <div className="canvas-grid-pattern" />
                    </div>
                ) : (
                    <div className="relative mt-3 flex min-h-0 flex-1 overflow-hidden rounded-none">
                        <div className="canvas-grid-pattern" />
                        <div
                            ref={tableCanvasRef}
                            className="relative min-h-0 flex-1 overflow-hidden rounded-none"
                            onPointerDown={(event) => {
                                if (event.target === event.currentTarget) {
                                    clearTableSelection();
                                }
                            }}
                        >
                            {visibleTableViews.map((view, viewIndex) => {
                                const tableLayer =
                                    movingTableId === view.table.id || resizingTableId === view.table.id
                                        ? visibleTableViews.length + 2
                                        : activeTableId === view.table.id
                                          ? visibleTableViews.length + 1
                                          : viewIndex + 1;
                                const tableHeaderColor = resolveTableHeaderColor(view.table.headerColor);
                                const tableHeaderStyle = { backgroundColor: tableHeaderColor };
                                const tableGridBorderStyle = {
                                    borderColor: hexToRgba(tableHeaderColor, 0.18)
                                };
                                const visibleRowCombos = getVisibleRowCombos(view);
                                const visibleColumnCombos = getVisibleColumnCombos(view);
                                const renderedColumnCombos =
                                    view.table.layout.columns.length > 0
                                        ? visibleColumnCombos
                                        : [{ key: "__total__", labels: ["Grand Total"] }];

                                return (
                                <motion.div
                                    key={view.table.id}
                                    onPointerDown={(event) => handleTablePointerDown(view.table.id, event)}
                                    style={{
                                        left: view.table.position.x,
                                        top: view.table.position.y,
                                        width: view.table.size.width,
                                        height: view.table.size.height,
                                        zIndex: tableLayer
                                    }}
                                    className={`absolute left-0 top-0 isolate flex max-h-full max-w-full flex-col overflow-visible rounded-none bg-white ${
                                        movingTableId === view.table.id
                                            ? "cursor-grabbing "
                                            : activeTableId === view.table.id
                                              ? "cursor-grab "
                                              : ""
                                    }${
                                        activeTableId === view.table.id
                                            ? "shadow-[0_32px_90px_-46px_rgba(11,14,20,0.34)]"
                                            : "shadow-[0_18px_42px_-34px_rgba(11,14,20,0.24)]"
                                    }`}
                                >
                                    {view.filteredRecords.length === 0 ? (
                                        <div className="min-h-0 flex-1" />
                                    ) : (
                                        <div className="min-h-0 flex-1 overflow-hidden">
                                            <div
                                                className="h-full w-full overflow-auto"
                                            >
                                                <table
                                                    ref={(node) => {
                                                        if (node) {
                                                            tableElementRefs.current[view.table.id] = node;
                                                            return;
                                                        }

                                                        delete tableElementRefs.current[view.table.id];
                                                    }}
                                                    className="pivot-table w-max min-w-max table-auto border-collapse text-[13px] leading-tight text-slate-800"
                                                >
                                                    <thead className="sticky top-0 z-10 text-white" style={tableHeaderStyle}>
                                                    <tr>
                                                        {(view.table.layout.rows.length > 0
                                                            ? view.table.layout.rows
                                                            : (["warehouseName"] as PivotFieldId[])
                                                        ).map((fieldId, index) => (
                                                            <th
                                                                key={`row-header:${view.table.id}:${fieldId}:${index}`}
                                                                rowSpan={view.showSecondaryHeaderRow ? 2 : 1}
                                                                className={`whitespace-nowrap border px-3 py-0.5 text-left ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                                                style={tableGridBorderStyle}
                                                            >
                                                                {view.table.layout.rows.length > 0
                                                                    ? getFieldDefinition(fieldId).label
                                                                    : "Rows"}
                                                            </th>
                                                        ))}

                                                        {view.hasColumnGroups ? (
                                                            visibleColumnCombos.map((combo) => (
                                                                <th
                                                                    key={`column-group:${view.table.id}:${combo.key}`}
                                                                    colSpan={
                                                                        view.hasMultipleValueFields
                                                                            ? view.pivotResult.valueFields.length
                                                                            : 1
                                                                    }
                                                                    className={`whitespace-nowrap border px-3 py-0.5 text-center ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                                                    style={tableGridBorderStyle}
                                                                >
                                                                    {combo.labels.join(" / ")}
                                                                </th>
                                                            ))
                                                        ) : (
                                                            view.pivotResult.valueFields.map((fieldId) => (
                                                                <th
                                                                key={`value-header-top:${view.table.id}:${fieldId}`}
                                                                className={`whitespace-nowrap border px-3 py-0.5 text-right ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                                                style={tableGridBorderStyle}
                                                            >
                                                                {getFieldDefinition(fieldId).label}
                                                            </th>
                                                        ))
                                                    )}

                                                        {view.hasColumnGroups
                                                            ? view.pivotResult.valueFields.map((fieldId) => (
                                                                <th
                                                                    key={`grand-header:${view.table.id}:${fieldId}`}
                                                                    rowSpan={view.showSecondaryHeaderRow ? 2 : 1}
                                                                    className={`whitespace-nowrap border px-3 py-0.5 text-right ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                                                    style={tableGridBorderStyle}
                                                                >
                                                                    {getFieldDefinition(fieldId).label}
                                                                </th>
                                                            ))
                                                            : null}
                                                    </tr>

                                                    {view.showSecondaryHeaderRow ? (
                                                        <tr>
                                                            {visibleColumnCombos.map((combo) =>
                                                                view.pivotResult.valueFields.map((fieldId) => (
                                                                    <th
                                                                        key={`value-header:${view.table.id}:${combo.key}:${fieldId}`}
                                                                        className={`whitespace-nowrap border px-3 py-0.5 text-right ${TABLE_HEADER_TEXT_TYPOGRAPHY} text-white`}
                                                                        style={tableGridBorderStyle}
                                                                    >
                                                                        {getFieldDefinition(fieldId).label}
                                                                    </th>
                                                                ))
                                                            )}
                                                        </tr>
                                                    ) : null}
                                                    </thead>
                                                    <tbody>
                                                    {visibleRowCombos.map((rowCombo, rowIndex) => (
                                                        <tr
                                                            key={`row:${view.table.id}:${rowCombo.key}`}
                                                            className={rowIndex % 2 === 0 ? "bg-white/96" : "bg-slate-50/55"}
                                                        >
                                                            {(view.table.layout.rows.length > 0
                                                                ? rowCombo.labels
                                                                : ["Grand Total"]
                                                            ).map((label, index) => (
                                                                <td
                                                                    key={`row-label:${view.table.id}:${rowCombo.key}:${index}`}
                                                                    className={`whitespace-nowrap border px-3 py-0.5 ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                                    style={tableGridBorderStyle}
                                                                >
                                                                    {label}
                                                                </td>
                                                            ))}

                                                            {renderedColumnCombos.map((columnCombo) =>
                                                                view.pivotResult.valueFields.map((fieldId) => (
                                                                    <td
                                                                        key={`cell:${view.table.id}:${rowCombo.key}:${columnCombo.key}:${fieldId}`}
                                                                        className={`whitespace-nowrap border px-3 py-0.5 text-right tabular-nums ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-slate-700`}
                                                                        style={tableGridBorderStyle}
                                                                    >
                                                                        {renderCell(view, rowCombo.key, columnCombo.key, fieldId)}
                                                                    </td>
                                                                ))
                                                            )}

                                                            {view.table.layout.columns.length > 0
                                                                ? view.pivotResult.valueFields.map((fieldId) => (
                                                                    <td
                                                                        key={`row-total:${view.table.id}:${rowCombo.key}:${fieldId}`}
                                                                        className={`whitespace-nowrap border bg-brandSoft/45 px-3 py-0.5 text-right tabular-nums ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                                        style={tableGridBorderStyle}
                                                                    >
                                                                        {renderRowTotal(
                                                                            view,
                                                                            rowCombo.key,
                                                                            fieldId,
                                                                            visibleColumnCombos
                                                                        )}
                                                                    </td>
                                                                ))
                                                                : null}
                                                        </tr>
                                                    ))}
                                                    </tbody>
                                                    <tfoot>
                                                    <tr>
                                                        {Array.from({
                                                            length: Math.max(view.table.layout.rows.length, 1)
                                                        }).map((_, index) => (
                                                            <td
                                                                key={`footer-label:${view.table.id}:${index}`}
                                                                className={`whitespace-nowrap border px-3 py-0.5 font-semibold ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                                style={tableGridBorderStyle}
                                                            >
                                                                {index === 0 ? "Grand Total" : ""}
                                                            </td>
                                                        ))}

                                                        {renderedColumnCombos.map((columnCombo) =>
                                                            view.pivotResult.valueFields.map((fieldId) => (
                                                                <td
                                                                    key={`column-total:${view.table.id}:${columnCombo.key}:${fieldId}`}
                                                                    className={`whitespace-nowrap border px-3 py-0.5 text-right font-semibold tabular-nums ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                                    style={tableGridBorderStyle}
                                                                >
                                                                    {renderColumnTotal(
                                                                        view,
                                                                        columnCombo.key,
                                                                        fieldId,
                                                                        visibleRowCombos
                                                                    )}
                                                                </td>
                                                            ))
                                                        )}

                                                        {view.table.layout.columns.length > 0
                                                            ? view.pivotResult.valueFields.map((fieldId) => (
                                                                <td
                                                                    key={`grand-total:${view.table.id}:${fieldId}`}
                                                                    className={`whitespace-nowrap border px-3 py-0.5 text-right font-semibold tabular-nums ${PIVOT_FIELD_TEXT_TYPOGRAPHY} text-ink`}
                                                                    style={tableGridBorderStyle}
                                                                >
                                                                    {renderGrandTotal(
                                                                        view,
                                                                        fieldId,
                                                                        visibleRowCombos,
                                                                        visibleColumnCombos
                                                                    )}
                                                                </td>
                                                            ))
                                                            : null}
                                                    </tr>
                                                    </tfoot>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {TABLE_RESIZE_HANDLES.map((handle) => (
                                        <button
                                            key={`${view.table.id}:${handle.direction}`}
                                            type="button"
                                            data-table-resize-handle="true"
                                            aria-label={`Resize ${view.table.name} from ${handle.direction}`}
                                            onPointerDown={(event) =>
                                                startTableResize(view.table.id, handle.direction, event)
                                            }
                                            className={`absolute z-20 block touch-none bg-transparent p-0 ${handle.className}`}
                                        />
                                    ))}
                                </motion.div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>
        </div>
    );
}
