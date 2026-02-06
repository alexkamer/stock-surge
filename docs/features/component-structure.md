# Component Structure for Industry Visualization

## Component Hierarchy

```
SectorIndustry (Main Container)
│
├── Header
│   ├── Sector Dropdown
│   └── Industry Dropdown
│
└── Sector View Content
    │
    ├── Sector Overview Card
    │   └── (Description, Stats, etc.)
    │
    ├── Top Companies Card
    │   └── (List of top companies)
    │
    ├── Industry Breakdown Card ⭐ NEW
    │   │
    │   ├── Header with Toggle
    │   │   ├── Title: "Industry Breakdown (N)"
    │   │   └── View Toggle Buttons
    │   │       ├── [Pie Chart] 🥧
    │   │       └── [Grid] 🔲
    │   │
    │   ├── Conditional Rendering based on viewType:
    │   │
    │   ├── IF viewType === "pie":
    │   │   └── 2-Column Layout (lg:grid-cols-5)
    │   │       │
    │   │       ├── Column 1 (60% - lg:col-span-3)
    │   │       │   └── IndustryPieChart
    │   │       │       ├── Full Pie Chart (recharts)
    │   │       │       ├── Legend
    │   │       │       ├── Tooltips
    │   │       │       └── onClick → handleIndustryClick()
    │   │       │
    │   │       └── Column 2 (40% - lg:col-span-2)
    │   │           └── IndustrySearchableList
    │   │               ├── Search Input Box
    │   │               ├── Results Counter
    │   │               ├── Scrollable List (ALL industries)
    │   │               │   ├── Color Dots
    │   │               │   ├── Industry Names
    │   │               │   └── Percentages
    │   │               └── onClick → handleIndustryClick()
    │   │
    │   └── IF viewType === "grid":
    │       └── IndustryGridView
    │           └── 2-Column Grid (md:grid-cols-2)
    │               └── Industry Cards
    │                   ├── Rank Badge
    │                   ├── Color Dot
    │                   ├── Industry Name
    │                   ├── Percentage Bar
    │                   ├── Percentage Value
    │                   ├── Symbol
    │                   └── onClick → handleIndustryClick()
    │
    ├── Top ETFs Card
    │   └── (List of ETFs)
    │
    └── Top Mutual Funds Card
        └── (List of mutual funds)
```

## Data Flow

```
1. User selects sector → SectorIndustry fetches sector data
                          ↓
2. sectorData.industries → useMemo: Generate colors
                          ↓
3. Generate colors based on sector → generateIndustryColors(count, sectorKey)
                          ↓
4. Map industries with metadata:
   - name
   - weight (market weight)
   - symbol
   - key (mapped from INDUSTRY_KEY_MAP)
   - color (from generated colors)
   - rank (1, 2, 3, ...)
                          ↓
5. Sort by weight (descending)
                          ↓
6. Render based on viewType:
   - "pie" → IndustryPieChart + IndustrySearchableList
   - "grid" → IndustryGridView
                          ↓
7. User clicks industry → handleIndustryClick(industryKey)
                          ↓
8. Set selectedIndustry + Set viewMode to "industry"
                          ↓
9. Fetch and display industry detail view
```

## Component Props

### IndustryPieChart
```typescript
interface IndustryPieChartProps {
  industries: Array<{
    name: string;
    weight: number;
    symbol: string;
    color: string;
    key: string;
  }>;
  onIndustryClick: (industryKey: string) => void;
}
```

### IndustrySearchableList
```typescript
interface IndustrySearchableListProps {
  industries: Array<{
    name: string;
    weight: number;
    symbol: string;
    color: string;
    key: string;
  }>;
  onIndustryClick: (industryKey: string) => void;
}
```

### IndustryGridView
```typescript
interface IndustryGridViewProps {
  industries: Array<{
    name: string;
    weight: number;
    symbol: string;
    color: string;
    key: string;
    rank: number;
  }>;
  onIndustryClick?: (industryKey: string) => void;
}
```

## State Management

### SectorIndustry Component State

```typescript
// Sector selection
const [selectedSector, setSelectedSector] = useState("technology");

// View mode: sector view or industry detail view
const [viewMode, setViewMode] = useState<"sector" | "industry">("sector");

// Selected industry for detail view
const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);

// Industry visualization type: pie chart or grid
const [industryViewType, setIndustryViewType] = useState<"grid" | "pie">("pie");
```

### Computed Values

```typescript
// Generated colors for industries
const industryColors = useMemo(() => {
  if (!sectorData?.industries) return [];
  return generateIndustryColors(sectorData.industries.length, selectedSector);
}, [sectorData, selectedSector]);

// Enhanced industries with all metadata
const availableIndustries = useMemo(() => {
  // Map, sort, and add ranks
}, [sectorData, industryColors]);
```

## Event Handlers

### handleIndustryClick(industryKey: string)
- Sets selected industry
- Switches view mode to "industry"
- Triggers industry data fetch
- **Used by**: Pie chart segments, list items, grid cards

### setIndustryViewType("pie" | "grid")
- Toggles between pie chart and grid visualization
- **Used by**: Toggle buttons in header

### handleSectorChange(sectorKey: string)
- Changes selected sector
- Resets industry selection
- Returns to sector view
- **Used by**: Sector dropdown

## Responsive Behavior

### Desktop (≥1024px)
```
┌─────────────────────────────────────────┐
│  [Pie Chart View] [Grid View]           │
│                                          │
│  ┌──────────────┬─────────────────────┐ │
│  │              │  [Search...]         │ │
│  │   Pie Chart  │  • Industry 1  35%  │ │
│  │   (Full)     │  • Industry 2  21%  │ │
│  │              │  • Industry 3  18%  │ │
│  │              │  (scrollable)        │ │
│  └──────────────┴─────────────────────┘ │
└─────────────────────────────────────────┘
   60%             40%
```

### Tablet (768px-1023px)
```
┌─────────────────────────────────────────┐
│  [Pie Chart View] [Grid View]           │
│                                          │
│  ┌─────────────┬──────────────────────┐ │
│  │  Pie Chart  │  [Search...]         │ │
│  │             │  • Industry 1  35%   │ │
│  │             │  (scrollable)        │ │
│  └─────────────┴──────────────────────┘ │
└─────────────────────────────────────────┘
   50%            50%
```

### Mobile (<768px)
```
┌────────────────────────────┐
│ [Pie Chart] [Grid]         │
│                            │
│ ┌────────────────────────┐ │
│ │     Pie Chart          │ │
│ │     (Smaller)          │ │
│ └────────────────────────┘ │
│                            │
│ [Search...]                │
│ • Industry 1        35%    │
│ • Industry 2        21%    │
│ (scrollable)               │
└────────────────────────────┘
```

## Color Generation Algorithm

```typescript
// For N industries in a sector:
for (let i = 0; i < count; i++) {
  // Spread colors around color wheel
  hue = (baseHue + (i * 360 / count)) % 360
  
  // Vary lightness for depth
  lightness = 55 + ((75 - 55) * i / max(count - 1, 1))
  
  // Professional saturation
  saturation = 65
  
  // Convert to hex
  color = hslToHex(hue, saturation, lightness)
}
```

### Sector Base Hues
- Technology: 220° (Blue)
- Healthcare: 150° (Green)
- Financial Services: 40° (Gold)
- Energy: 25° (Orange)
- And more...

## Styling Classes

### Custom Classes
- `.custom-scrollbar` - Styled scrollbar for lists
- `.card` - Card container styling
- `.text-primary` - Primary color text
- `.bg-primary` - Primary color background

### Color Variables
```css
--color-primary: #0ECB81 (green)
--color-background: #121212 (dark)
--color-surface: #1A1A1A (card bg)
--color-border: #333333 (borders)
--color-text-primary: #F2F2F2 (main text)
--color-text-secondary: #B3B3B3 (secondary text)
```
