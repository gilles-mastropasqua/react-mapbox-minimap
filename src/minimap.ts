import type {
  MapLib,
  MapMouseEvent,
  MapInstance,
  MinimapOptions,
  IControl,
} from "./types";

export default class Minimap<MapT extends MapInstance>
  implements IControl<MapT>
{
  private mapGL!: MapLib<MapT>;
  private options: MinimapOptions;

  private container: HTMLDivElement | HTMLElement | null;
  private map: MapT | null;
  private minimap: MapT | null;
  private minimapCanvas: HTMLCanvasElement | HTMLElement | null;

  private toggleButton: HTMLAnchorElement | null;

  private isCollapsed: boolean;
  private isDragging: boolean;
  private isCursorOverFeature: boolean;

  private currentPoint: number[];
  private previousPoint: number[];
  private trackingRect: any;
  private trackingRectCoordinates: number[][][];

  private onLoad: () => void;
  private onToggle: () => void;
  private onMainMapMove: () => void;
  private onMainMapMoveEnd: () => void;
  private onMouseMove: (e: MapMouseEvent<MapT>) => void;
  private onMouseDown: (e: MapMouseEvent<MapT>) => void;
  private onMouseUp: () => void;

  constructor(mapgl: MapLib<MapT>, config?: MinimapOptions) {
    this.mapGL = mapgl;

    // Initialize internal state
    this.map = null;
    this.minimap = null;
    this.container = null;
    this.minimapCanvas = null;

    this.toggleButton = null;

    // State flags
    this.isCollapsed = false;
    this.isDragging = false;
    this.isCursorOverFeature = false;

    // Initialize tracking coordinates
    this.currentPoint = [0, 0];
    this.previousPoint = [0, 0];
    this.trackingRectCoordinates = [[[], [], [], [], []]];

    // Bind methods to instance
    this.onLoad = this.load.bind(this);
    this.onToggle = this.toggle.bind(this);
    this.onMainMapMove = this.update.bind(this);
    this.onMainMapMoveEnd = this.mapMoved.bind(this);
    this.onMouseMove = this.mouseMove.bind(this);
    this.onMouseDown = this.mouseDown.bind(this);
    this.onMouseUp = this.mouseUp.bind(this);

    // Default options for the minimap
    this.options = {
      id: "mapgl-minimap",
      width: "320px",
      height: "180px",
      style: {
        version: 8,
        sources: {},
        layers: [],
      },
      center: [0, 0],
      zoomLevelOffset: -3,
      lineColor: "#136a7e", // Color of the tracking rectangle border
      lineWidth: 1, // Thickness of the tracking rectangle border
      lineOpacity: 1, // Opacity of the tracking rectangle border
      fillColor: "#d77a34", // Fill color for the tracking rectangle
      fillOpacity: 0.25, // Opacity of the fill color
      toggleDisplay: false, // Option to enable the collapse/expand button
      dragPan: false, // Disable drag panning on the minimap
      scrollZoom: false, // Disable scroll zoom on the minimap
      boxZoom: false, // Disable box zoom on the minimap
      dragRotate: false, // Disable drag rotate on the minimap
      keyboard: false, // Disable keyboard controls on the minimap
      doubleClickZoom: false, // Disable double-click zoom on the minimap
      touchZoomRotate: false, // Disable touch controls on the minimap
      disableMinimapMoveOnDrag: false, // Allow minimap move when dragging
      enableResize: false, // Option to allow resizing of the minimap
      enableMove: false, // Option to allow moving the minimap
    };

    // Merge custom configuration with defaults
    if (config) {
      Object.assign(this.options, config);
    }
  }

  // Enable resizing of the minimap if the option is active
  private enableResize(): void {
    if (!this.container || !this.options.enableResize) return;

    // Setup resizable container
    Object.assign(this.container!.style, {
      resize: "both",
      overflow: "hidden",
      // minWidth: "150px",
      // minHeight: "100px",
    });

    const minimapContainer = this.minimap?.getContainer();

    const handleResize = () => {
      if (this.minimap) {
        (this.minimap as any).resize(); // Resize the minimap during container resize
      }
    };

    const onMouseDown = () => {
      if (minimapContainer) {
        minimapContainer.style.transition = "none"; // Disable transitions during resizing
      }
      window.addEventListener("mousemove", handleResize);
    };

    const onMouseUp = () => {
      window.removeEventListener("mousemove", handleResize);
    };

    this.container!.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp, { once: true });
  }

  // Enable moving of the minimap if the option is active
  private enableMove(): void {
    if (!this.container || !this.options.enableMove) return;

    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let initialLeft = 0;
    let initialTop = 0;

    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newLeft = initialLeft + (e.clientX - startX);
        const newTop = initialTop + (e.clientY - startY);

        this.container!.style.left = `${newLeft}px`;
        this.container!.style.top = `${newTop}px`;
      }
    };

    const onMouseUp = () => {
      isDragging = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      initialLeft = this.container!.offsetLeft;
      initialTop = this.container!.offsetTop;

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    };

    // Create a move handle for dragging the minimap
    const moveHandle = document.createElement("div");

    Object.assign(moveHandle.style, {
      width: "24px",
      height: "24px",
      background: "white",
      position: "absolute",
      top: "0px",
      left: "0px",
      cursor: "move",
      zIndex: "999",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    });

    moveHandle.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="4" cy="4" r="1"></circle>
        <circle cx="12" cy="4" r="1"></circle>
        <circle cx="20" cy="4" r="1"></circle>
        <circle cx="4" cy="12" r="1"></circle>
        <circle cx="12" cy="12" r="1"></circle>
        <circle cx="20" cy="12" r="1"></circle>
        <circle cx="4" cy="20" r="1"></circle>
        <circle cx="12" cy="20" r="1"></circle>
        <circle cx="20" cy="20" r="1"></circle>
      </svg>
    `;

    moveHandle.addEventListener("mousedown", (e) =>
      onMouseDown(e as MouseEvent)
    );
    this.container!.appendChild(moveHandle);
  }

  // Add the minimap to the main map
  onAdd(map: MapT): HTMLElement {
    this.map = map;
    this.container = this.createContainer(map);

    const opts = this.options;
    const minimap = (this.minimap = new this.mapGL.Map({
      attributionControl: false,
      container: this.container,
      style: opts.style,
      center: opts.center,
      trackResize: false,
    }));

    this.zoomAdjust();

    if (opts.maxBounds) minimap.setMaxBounds(opts.maxBounds);
    minimap.getCanvas().removeAttribute("tabindex");

    minimap.on("load", this.onLoad);
    this.enableResize();
    this.enableMove();
    this.enableToggle();

    return this.container;
  }

  // Remove the minimap and clean up event listeners
  onRemove(): void {
    if (this.map) this.map.off("move", this.onMainMapMove);
    if (this.minimap) {
      this.minimap.off("mousemove", this.onMouseMove);
      this.minimap.off("mousedown", this.onMouseDown);
      this.minimap.off("mouseup", this.onMouseUp);
    }
    if (this.minimapCanvas) {
      this.minimapCanvas.removeEventListener("wheel", this.preventDefault);
    }
    if (this.toggleButton) {
      this.toggleButton.removeEventListener("click", this.preventDefault);
      this.toggleButton.removeEventListener("click", this.onToggle);
    }
    if (this.container) {
      this.container.removeEventListener("contextmenu", this.preventDefault);
      const parentNode = this.container.parentNode;
      if (parentNode) parentNode.removeChild(this.container);
    }
    this.minimap = null;
  }

  // Handle map loading event, initialize the tracking rectangle
  private load(): void {
    const opts: any = this.options;
    const map: any = this.map;
    const minimap: any = this.minimap;

    const interactions = [
      "dragPan",
      "scrollZoom",
      "boxZoom",
      "dragRotate",
      "keyboard",
      "doubleClickZoom",
      "touchZoomRotate",
    ];

    // Disable unwanted interactions based on options
    for (const interaction of interactions) {
      if (!opts[interaction]) {
        minimap[interaction].disable();
      }
    }

    // Remove existing trackingRect layers and sources
    if (minimap.getLayer("trackingRectOutline"))
      minimap.removeLayer("trackingRectOutline");
    if (minimap.getLayer("trackingRectFill"))
      minimap.removeLayer("trackingRectFill");
    if (minimap.getSource("trackingRect")) minimap.removeSource("trackingRect");

    // Add new tracking rectangle layers and sources
    minimap.addSource("trackingRect", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: { name: "trackingRect" },
        geometry: {
          type: "Polygon",
          coordinates: this.trackingRectCoordinates,
        },
      },
    });

    minimap.addLayer({
      id: "trackingRectOutline",
      type: "line",
      source: "trackingRect",
      layout: {},
      paint: {
        "line-color": opts.lineColor,
        "line-width": opts.lineWidth,
        "line-opacity": opts.lineOpacity,
      },
    });

    minimap.addLayer({
      id: "trackingRectFill",
      type: "fill",
      source: "trackingRect",
      layout: {},
      paint: {
        "fill-color": opts.fillColor,
        "fill-opacity": opts.fillOpacity,
      },
    });

    this.trackingRect = minimap.getSource("trackingRect");
    this.update();

    // Sync minimap with main map movements
    map.on("move", this.onMainMapMove);
    map.on("moveend", this.onMainMapMoveEnd);

    minimap.on("mousemove", this.onMouseMove);
    minimap.on("mousedown", this.onMouseDown);
    minimap.on("mouseup", this.onMouseUp);

    this.minimapCanvas = minimap.getCanvasContainer();
    if (this.minimapCanvas) {
      this.minimapCanvas.addEventListener("wheel", this.preventDefault);
    }
  }

  // Mouse interaction for dragging the tracking rectangle
  private mouseDown(e: MapMouseEvent<MapT>): void {
    if (this.isCursorOverFeature) {
      this.isDragging = true;
      this.previousPoint = this.currentPoint;
      this.currentPoint = [e.lngLat.lng, e.lngLat.lat];
    }
  }

  toggle(): void {
    !this.isCollapsed ? this.collapse() : this.expand();
  }

  // Collapse the minimap to a smaller size
  private collapse(): void {
    if (!this.container || !this.toggleButton) return;
    const opts = this.options;
    if (opts.toggleDisplay) {
      this.container.style.width = "24px";
      this.container.style.height = "24px";
      this.container.style.resize = "none";
      this.toggleButton.innerHTML =
        "<svg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 -960 960 960' width='24'><path d='M200-200v-240h80v160h160v80H200Zm480-320v-160H520v-80h240v240h-80Z'/></svg>";
      this.isCollapsed = true;
    }
  }

  // Expand the minimap to its original size
  private expand(): void {
    if (!this.container || !this.toggleButton) return;
    const opts = this.options;
    if (opts.toggleDisplay) {
      this.container.style.width = opts.width || "320px";
      this.container.style.height = opts.height || "180px";
      this.container.style.resize = this.options.enableResize ? "both" : "none";
      this.toggleButton.innerHTML =
        "<svg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 -960 960 960' width='24'><path d='M440-440v240h-80v-160H200v-80h240Zm160-320v160h160v80H520v-240h80Z'/></svg>";
      this.isCollapsed = false;
    }
  }

  // Handle mouse movement to drag the tracking rectangle
  private mouseMove(e: MapMouseEvent<MapT>): void {
    if (!this.minimapCanvas || !this.minimap || !this.map) return;

    const features = this.minimap.queryRenderedFeatures(e.point, {
      layers: ["trackingRectFill"],
    });

    if (!(this.isCursorOverFeature && features.length > 0)) {
      this.isCursorOverFeature = features.length > 0;
      this.minimapCanvas.style.cursor = this.isCursorOverFeature ? "move" : "";
    }

    if (this.isDragging) {
      this.previousPoint = this.currentPoint;
      this.currentPoint = [e.lngLat.lng, e.lngLat.lat];
      const offset = [
        this.previousPoint[0] - this.currentPoint[0],
        this.previousPoint[1] - this.currentPoint[1],
      ];
      const newBounds = this.moveTrackingRect(offset);
      if (!this.options.disableMinimapMoveOnDrag) {
        this.map.fitBounds(newBounds, { duration: 80 });
      }
    }
  }

  private mouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      if (this.trackingRect && this.map && this.minimap) {
        const trackingRectData = this.trackingRect._data;
        const bounds = trackingRectData.properties.bounds;
        this.map.off("move", this.onMainMapMove);
        this.map.fitBounds(bounds, { duration: 500 });
      }
    }
  }

  // Adjust the minimap's zoom level to match the main map
  private zoomAdjust(): void {
    if (this.minimap && this.map)
      this.minimap.setZoom(this.map.getZoom() + this.options.zoomLevelOffset);
  }

  // Sync the minimap's tracking rectangle with the main map's bounds
  private setTrackingRectBounds(): void {
    if (!this.map) return;
    const bounds = this.map.getBounds();
    const source = this.trackingRect;
    if (!source) return;
    const data = source._data;
    data.properties.bounds = bounds;
    this.convertBoundsToPoints(bounds);
    source.setData(data);
  }

  // Helper function to convert map bounds to polygon coordinates
  convertBoundsToPoints(bounds: any): void {
    const ne = bounds._ne;
    const sw = bounds._sw;
    const trc = this.trackingRectCoordinates;

    trc[0][0][0] = ne.lng;
    trc[0][0][1] = ne.lat;
    trc[0][1][0] = sw.lng;
    trc[0][1][1] = ne.lat;
    trc[0][2][0] = sw.lng;
    trc[0][2][1] = sw.lat;
    trc[0][3][0] = ne.lng;
    trc[0][3][1] = sw.lat;
    trc[0][4][0] = ne.lng;
    trc[0][4][1] = ne.lat;
  }

  // Move the tracking rectangle on the minimap when dragging
  private moveTrackingRect(offset: number[]) {
    if (!this.trackingRect) return;
    const source = this.trackingRect;
    const data = source._data;
    if (!data) return;
    const bounds = data.properties.bounds;
    bounds._ne.lat -= offset[1];
    bounds._ne.lng -= offset[0];
    bounds._sw.lat -= offset[1];
    bounds._sw.lng -= offset[0];

    // Restrict bounds to valid latitude/longitude ranges
    bounds._ne.lat = Math.min(bounds._ne.lat, 90);
    bounds._ne.lng = Math.min(bounds._ne.lng, 180);
    bounds._sw.lat = Math.max(bounds._sw.lat, -90);
    bounds._sw.lng = Math.max(bounds._sw.lng, -180);

    source.setData(data);
    return bounds;
  }

  // Update minimap on main map movement
  private update(): void {
    if (this.isDragging) return;
    this.zoomAdjust();
    this.setTrackingRectBounds();
  }

  // Sync the minimap's center when the main map is moved
  private mapMoved(): void {
    if (this.minimap && this.map) this.minimap.setCenter(this.map.getCenter());
  }

  // Create the minimap's container DOM element
  private createContainer(map: MapT): HTMLDivElement {
    const opts = this.options;
    const container = document.createElement("div");
    container.className = "mapgl-minimap maplibregl-ctrl mapboxgl-ctrl";
    if (opts.containerClass) container.classList.add(opts.containerClass);
    container.setAttribute(
      "style",
      "box-sizing: content-box; box-shadow: 0 1px 5px rgba(0, 0, 0, 0.65); border: 3px solid white; width: " +
        opts.width +
        "; height: " +
        opts.height +
        ";"
    );
    container.style.transition = "height 0.6s, width 0.6s";
    container.addEventListener("contextmenu", this.preventDefault);
    map.getContainer().appendChild(container);

    if (opts.id && opts.id.length > 0) {
      container.id = opts.id;
    }

    return container;
  }

  // Enable the toggle button to collapse/expand the minimap
  private enableToggle(): void {
    if (!this.container) return;
    const opts = this.options;
    if (!opts.toggleDisplay) return;

    this.toggleButton = this.createToggleButton();
    this.container.appendChild(this.toggleButton);

    this.toggleButton.setAttribute(
      "style",
      "position: absolute; top: 0; right: 0;z-index: 1000; margin:0; background-color: white;"
    );
    this.toggleButton.style.width = "24px";
    this.toggleButton.style.height = "24px";
    this.toggleButton.style.display = "block";
  }

  // Create the toggle button DOM element
  private createToggleButton(): HTMLAnchorElement {
    const opts = this.options;
    const button = document.createElement("a");
    button.innerHTML =
      "<svg xmlns='http://www.w3.org/2000/svg' height='24' viewBox='0 -960 960 960' width='24' style='fillColor: inherit'><path d='M440-440v240h-80v-160H200v-80h240Zm160-320v160h160v80H520v-240h80Z'/></svg>";
    button.className = "mapgl-minimap maplibregl-ctrl mapboxgl-ctrl";
    button.style.margin = "0";
    button.style.display = "block";
    button.style.backgroundColor = opts.lineColor || "#136a7e";
    button.style.fill = opts.fillColor || "#d77a34";
    button.href = "#";

    button.addEventListener("click", this.preventDefault);
    button.addEventListener("click", this.onToggle);
    return button;
  }

  private preventDefault(e: Event): void {
    e.preventDefault();
  }
}
