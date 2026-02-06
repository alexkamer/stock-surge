# Industry Visualization User Guide

## Overview

The enhanced Industry Breakdown section provides an interactive way to visualize and explore market weight distribution across industries within a sector. You can toggle between a pie chart view and a grid view, search for specific industries, and click on any industry to view detailed analytics.

## Features

### 1. Pie Chart View (Default)

The pie chart view displays a full circle pie chart showing the relative market weight of each industry in the selected sector.

**Features:**
- **Visual Representation**: Each slice represents an industry, sized proportionally to its market weight
- **Color-Coded**: Each industry has a unique color that's consistent across all views
- **Interactive Segments**: Click any slice to navigate to that industry's detail page
- **Tooltips**: Hover over any slice to see the industry name and exact percentage
- **Legend**: Below the chart shows all industries with their colors
- **Percentage Labels**: Large segments (>5%) show their percentage directly on the chart

**Right Side Panel:**
- **Search Box**: Filter industries in real-time by typing
- **Complete List**: All industries are displayed (not just top 5)
- **Scrollable**: Scroll through the complete list
- **Click to Navigate**: Click any industry to view its details
- **Color Indicators**: Small colored dots match the pie chart

### 2. Grid View

The grid view displays industries in a card-based layout with detailed information.

**Features:**
- **Rank Badges**: Shows each industry's rank by market weight (1, 2, 3, etc.)
- **Color Dots**: Color-coded indicators matching the pie chart
- **Percentage Bars**: Visual bar showing relative market weight
- **Detailed Info**: Industry name, percentage, and symbol
- **Click to Navigate**: Click any card to view industry details
- **Responsive**: Adapts to 1 or 2 columns based on screen size

### 3. View Toggle

Switch between pie chart and grid views using the toggle buttons at the top right of the Industry Breakdown section.

**Buttons:**
- **Pie Chart**: Shows the pie chart with searchable list
- **Grid**: Shows the grid view with cards

## How to Use

### Viewing Industry Data

1. **Select a Sector**: Use the sector dropdown at the top to choose a sector (e.g., Technology, Healthcare)

2. **Scroll to Industry Breakdown**: The Industry Breakdown section appears below Top Companies

3. **Explore the Visualization**:
   - **In Pie Chart View**:
     - Observe the relative sizes of industry segments
     - Hover over segments to see details
     - Use the search box to filter industries
     - Scroll through the complete list on the right

   - **In Grid View**:
     - See all industries with rank badges
     - Compare market weights using the percentage bars
     - View all details at a glance

### Navigating to Industry Details

You can navigate to an industry's detail page in multiple ways:

1. **Click a Pie Chart Slice**: Click any colored segment in the pie chart
2. **Click a List Item**: Click any industry in the searchable list (pie view)
3. **Click a Grid Card**: Click any industry card in the grid view
4. **Use the Dropdown**: Select an industry from the industry dropdown at the top

All methods instantly navigate to the detailed industry view with:
- Industry description
- Top performing companies
- Top growth companies
- Key metrics and statistics

### Searching for Industries

**In Pie Chart View:**

1. Find the search box in the right panel
2. Type any part of an industry name
3. The list filters in real-time
4. Results counter shows how many match
5. Click "Clear" or delete your text to restore the full list

**Search Tips:**
- Search is case-insensitive
- Partial matches work (e.g., "soft" finds "Software - Infrastructure")
- No results? Try a different term or clear the search

### Switching Between Sectors

When you change sectors:
- New industry data loads automatically
- Colors regenerate based on the sector's theme
- View preference (pie/grid) is maintained
- Selected industry is reset

**Sector Color Themes:**
- Technology: Blue tones
- Healthcare: Green tones
- Financial Services: Gold tones
- Energy: Orange tones
- Consumer Cyclical: Purple tones
- And more...

## Understanding the Data

### Market Weight

Market weight represents the proportion of market capitalization that an industry contributes to its sector.

**Example:**
- If Semiconductors has a 35.2% market weight in the Technology sector
- It means 35.2% of the Technology sector's total market cap comes from semiconductor companies

**Key Points:**
- All market weights in a sector sum to approximately 100%
- Higher percentage = larger industry by market cap
- Percentages update based on real market data

### Industry Rankings

In grid view, industries are ranked by market weight:
- Rank 1 = Largest industry by market cap
- Rank 2 = Second largest
- And so on...

Rankings update automatically when you switch sectors.

## Responsive Design

The Industry Breakdown section adapts to your screen size:

**Desktop (Large Screens):**
- Pie chart and list side-by-side (60/40 split)
- 2-column grid view
- Full-featured experience

**Tablet (Medium Screens):**
- Pie chart and list side-by-side (50/50 split)
- 2-column grid view
- Slightly compressed layout

**Mobile (Small Screens):**
- Pie chart on top, list below (stacked)
- 1-column grid view
- Optimized for touch interactions
- Smaller chart size for better fit

## Tips and Tricks

1. **Quick Navigation**: Click pie slices for the fastest way to explore industries

2. **Compare Industries**: Use the grid view to see all percentages and rankings at once

3. **Find Specific Industries**: Use the search feature instead of scrolling

4. **Color Matching**: The same colors appear in the pie chart, legend, list, and grid for consistency

5. **Responsive Toggle**: Try resizing your browser to see the responsive design in action

6. **Multiple Sectors**: Switch between sectors to compare industry distributions

7. **Return to Sector View**: Use the "← View All Industries" option in the industry dropdown or click "Back to Sectors" button

## Troubleshooting

**Pie chart not displaying:**
- Ensure the sector has loaded (check for loading indicator)
- Try refreshing the page
- Check that you're in pie chart view (toggle button should be highlighted)

**Search returns no results:**
- Check your spelling
- Try a shorter search term
- Click "Clear" to see all industries again

**Colors look similar:**
- Colors are generated to be distinct, but some may appear similar on certain displays
- Use the hover tooltip or legend to identify industries
- Grid view shows industry names clearly

**Click not working:**
- Ensure you're clicking directly on a segment, list item, or card
- Check that the data has finished loading
- Try clicking a different industry first

## Keyboard Accessibility

The industry visualization is keyboard accessible:

- **Tab**: Navigate through interactive elements (buttons, search, industry items)
- **Enter/Space**: Activate buttons and select industries
- **Type**: Search automatically focuses when you start typing (in pie view)
- **Escape**: Clear search (when search is focused)

## Performance

The visualization is optimized for performance:

- Colors are generated once per sector (memoized)
- Industry data is transformed once (memoized)
- View switching is instant (no re-fetching)
- Search filtering is real-time with no lag

## Future Enhancements (Planned)

- Export chart as image
- Save view preference to localStorage
- Sort options (by name, by percentage)
- Multi-industry comparison
- Time-series view of industry trends
- Customizable color themes

## Feedback

To report issues or suggest improvements, please file an issue at:
https://github.com/anthropics/claude-code/issues

---

**Last Updated**: 2026-02-05
**Version**: 1.0.0
