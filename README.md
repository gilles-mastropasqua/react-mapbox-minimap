# Mapbox Minimap Control

This package provides a minimap control for Mapbox GL or Maplibre GL maps. The minimap displays a smaller version of the main map, highlighting a portion of the view with a tracking rectangle. The minimap can be customized, moved, and resized based on your needs.

![Description of the image](https://3w-creation.net/demo-minimap.png)

## Installation

```bash
npm i react-mapbox-minimap
```
## Usage

In your Mapbox or Maplibre GL project, you can add the minimap control as follows:

```typescript
import Minimap from 'react-mapbox-minimap';

// Assuming 'map' is your main Mapbox GL map instance
const minimap = new Minimap(mapboxgl, {
  width: "320px",
  height: "180px",
  zoomLevelOffset: -3,
  lineColor: "#136a7e",
  fillColor: "#d77a34",
  toggleDisplay: true,
  enableResize: true,
  enableMove: true,
});

map.addControl(minimap);
```

### Options

Here are the available options you can use to customize the minimap:

- `id` (string): The HTML `id` of the minimap container. Default is `"mapgl-minimap"`.
- `width` (string): The width of the minimap. Default is `"320px"`.
- `height` (string): The height of the minimap. Default is `"180px"`.
- `style` (object): The style object for the minimap. It follows the Mapbox GL style format, similar to the main map.
- `center` (array): Initial center coordinates for the minimap. Default is `[0, 0]`.
- `zoomLevelOffset` (number): Adjusts the zoom level of the minimap compared to the main map. Default is `-3`.
- `lineColor` (string): The color of the tracking rectangle's outline. Default is `"#136a7e"`.
- `lineWidth` (number): The thickness of the tracking rectangle's outline. Default is `1`.
- `lineOpacity` (number): The opacity of the tracking rectangle's outline. Default is `1`.
- `fillColor` (string): The fill color of the tracking rectangle. Default is `"#d77a34"`.
- `fillOpacity` (number): The opacity of the fill color in the tracking rectangle. Default is `0.25`.
- `toggleDisplay` (boolean): Adds a button to collapse/expand the minimap. Default is `false`.
- `dragPan` (boolean): Enables or disables drag panning in the minimap. Default is `false`.
- `scrollZoom` (boolean): Enables or disables zooming via scroll in the minimap. Default is `false`.
- `boxZoom` (boolean): Enables or disables box zoom in the minimap. Default is `false`.
- `dragRotate` (boolean): Enables or disables map rotation via dragging in the minimap. Default is `false`.
- `keyboard` (boolean): Enables or disables keyboard controls in the minimap. Default is `false`.
- `doubleClickZoom` (boolean): Enables or disables zooming via double-click in the minimap. Default is `false`.
- `touchZoomRotate` (boolean): Enables or disables touch gestures in the minimap. Default is `false`.
- `disableMinimapMoveOnDrag` (boolean): If `true`, dragging the tracking rectangle from the minimap does not update the main minimap's bounds until the mouse is released. Default is `false`.
- `enableResize` (boolean): Allows the user to resize the minimap. Default is `false`.
- `enableMove` (boolean): Allows the user to move the minimap by dragging it. Default is `false`.


### Example

```typescript

map = new mapboxgl.Map({
    container: mapContainer.current as HTMLDivElement,
    style: "mapbox://styles/mapbox/outdoors-v12",
    center: [lng, lat],
    zoom: zoom,
});

map.on("load", function () {
    const minimap = new Minimap(mapboxgl, {
        center: [lng, lat],
        style: "mapbox://styles/mapbox/outdoors-v12",
        toggleDisplay: true,
        zoomLevelOffset: -4,
        scrollZoom: true,
        disableMinimapMoveOnDrag: true,
        enableResize: true,
        enableMove: true,
    });

    map.addControl(minimap, "bottom-right");
});

```

## Credits

This project is heavily inspired by the original work of **Laura Mosher** ([@lauramosher](https://github.com/lauramosher)). The core functionality of this minimap control is based on her excellent work, to which I have added a few additional features and customization options, such as the ability to resize and move the minimap.
