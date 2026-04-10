import { useEffect, useRef, useState } from "react";
import {
  MathUtils,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  SphereGeometry,
  TextureLoader,
  Vector3,
  WebGLRenderer,
  Mesh,
  MeshBasicMaterial
} from "three";

const TABLE_LIBRARY = [
  {
    type: "two",
    label: "Table For 2",
    seats: 2,
    width: 86,
    height: 86,
    shape: "round"
  },
  {
    type: "four",
    label: "Table For 4",
    seats: 4,
    width: 108,
    height: 108,
    shape: "round"
  },
  {
    type: "six",
    label: "Table For 6",
    seats: 6,
    width: 148,
    height: 92,
    shape: "rect"
  },
  {
    type: "ten",
    label: "Table For 10",
    seats: 10,
    width: 220,
    height: 92,
    shape: "rect"
  }
];

const DEFAULT_FLOORPLAN = {
  width: 680,
  height: 520
};

const INITIAL_TABLES = [
  {
    id: "table-window",
    type: "two",
    name: "Window Table",
    seats: 2,
    description: "Quiet corner near the front with a calm view and softer light.",
    availableTimes: ["12:00", "14:00", "18:30"],
    hours: "Available today: 12:00, 14:00, 18:30",
    image: "/panoramas/image.webp",
    x: 96,
    y: 98,
    width: 86,
    height: 86,
    shape: "round"
  },
  {
    id: "table-central",
    type: "four",
    name: "Central Table",
    seats: 4,
    description: "Balanced spot in the middle of the dining room with quick service access.",
    availableTimes: ["13:00", "16:30", "20:00"],
    hours: "Available today: 13:00, 16:30, 20:00",
    image: "",
    x: 288,
    y: 248,
    width: 108,
    height: 108,
    shape: "round"
  },
  {
    id: "table-chef",
    type: "six",
    name: "Chef's Table",
    seats: 6,
    description: "Longer table closest to the open kitchen and evening atmosphere.",
    availableTimes: ["17:00", "19:30", "21:00"],
    hours: "Available today: 17:00, 19:30, 21:00",
    image: "",
    x: 510,
    y: 120,
    width: 148,
    height: 92,
    shape: "rect"
  }
];

const navItems = [
  { id: "home", label: "Home", hash: "#/" },
  { id: "menu", label: "Menu", hash: "#/menu" },
  { id: "blog", label: "Blog", hash: "#/blog" },
  { id: "contact", label: "Cont", hash: "#/contact" }
];

const menuSections = [
  {
    title: "Food Menu",
    items: [
      { name: "Forest Mushroom Tart", description: "Crisp pastry, goat cheese, caramelized shallots, herb oil.", price: "$15" },
      { name: "Grilled Sea Bass", description: "Citrus glaze, charred greens, fennel, and smoked butter.", price: "$20" },
      { name: "Truffle Pasta", description: "Fresh tagliatelle with parmesan cream and black truffle finish.", price: "$35" },
      { name: "Braised Short Rib", description: "Slow-cooked beef, root vegetables, and rosemary jus.", price: "$40" },
      { name: "Garden Risotto", description: "Seasonal vegetables, white wine, lemon zest, and pecorino.", price: "$55" },
      { name: "Fire Roasted Chicken", description: "Crisp skin, garlic puree, and market herb salad.", price: "$15" }
    ]
  },
  {
    title: "Drink Menu",
    items: [
      { name: "Citrus Spritz", description: "Sparkling aperitif with orange peel and fresh herbs.", price: "$10" },
      { name: "House Red", description: "Soft tannins, dark berry notes, and a warm finish.", price: "$15" },
      { name: "Garden Mocktail", description: "Cucumber, lime, basil, and tonic over crushed ice.", price: "$20" },
      { name: "Smoked Old Fashioned", description: "Bourbon, bitters, demerara syrup, and orange smoke.", price: "$25" },
      { name: "Rosé By The Glass", description: "Dry floral rosé with strawberry and mineral notes.", price: "$30" },
      { name: "Espresso Martini", description: "Vodka, coffee liqueur, and fresh espresso crema.", price: "$35" }
    ]
  }
];

const contactDetails = {
  phoneDisplay: "+1 (555) 123-4567",
  phoneHref: "tel:+15551234567",
  email: "reservations@demo-restaurant.com",
  whatsappHref: "https://wa.me/15551234567?text=Hello%20I%20would%20like%20to%20make%20a%20reservation.",
  address: "12 Anywhere St., Any City, ST 12345",
  hours: "Open daily: 12:00 PM to 11:00 PM"
};

const ADMIN_STORAGE_KEY = "demo-restaurant-admin-state-v1";

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getTablePreset(type) {
  return TABLE_LIBRARY.find((table) => table.type === type) ?? TABLE_LIBRARY[0];
}

function makeTable(type, x, y, count) {
  const preset = getTablePreset(type);
  const availableTimes = ["12:00", "14:00", "18:00"];

  return {
    id: `table-${Date.now()}-${count}`,
    type: preset.type,
    name: `${preset.label} ${count}`,
    seats: preset.seats,
    description: "",
    availableTimes,
    hours: `Available today: ${availableTimes.join(", ")}`,
    image: "",
    x,
    y,
    width: preset.width,
    height: preset.height,
    shape: preset.shape
  };
}

function parseAvailableTimes(hours = "") {
  const source = hours.includes(":") ? hours.split(":").slice(1).join(":") : hours;

  return source
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function formatAvailableHours(times) {
  return times.length ? `Available today: ${times.join(", ")}` : "No times currently available";
}

function normalizeTable(table) {
  const availableTimes = Array.isArray(table.availableTimes) && table.availableTimes.length
    ? table.availableTimes
    : parseAvailableTimes(table.hours);

  return {
    ...table,
    availableTimes,
    hours: formatAvailableHours(availableTimes)
  };
}

function getSeatMarkers(table) {
  if (table.seats === 2) {
    return [
      { left: "50%", top: "8%" },
      { left: "50%", top: "92%" }
    ];
  }

  if (table.seats === 4) {
    return [
      { left: "50%", top: "6%" },
      { left: "92%", top: "50%" },
      { left: "50%", top: "94%" },
      { left: "8%", top: "50%" }
    ];
  }

  if (table.seats === 6) {
    return [
      { left: "28%", top: "8%" },
      { left: "72%", top: "8%" },
      { left: "94%", top: "50%" },
      { left: "72%", top: "92%" },
      { left: "28%", top: "92%" },
      { left: "6%", top: "50%" }
    ];
  }

  return [
    { left: "22%", top: "8%" },
    { left: "40%", top: "8%" },
    { left: "60%", top: "8%" },
    { left: "78%", top: "8%" },
    { left: "94%", top: "50%" },
    { left: "78%", top: "92%" },
    { left: "60%", top: "92%" },
    { left: "40%", top: "92%" },
    { left: "22%", top: "92%" },
    { left: "6%", top: "50%" }
  ];
}

function loadAdminState() {
  const fallback = {
    floorplan: DEFAULT_FLOORPLAN,
    tables: INITIAL_TABLES.map(normalizeTable)
  };

  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(ADMIN_STORAGE_KEY);

    if (!raw) {
      return fallback;
    }

    const parsed = JSON.parse(raw);

    return {
      floorplan: parsed.floorplan ?? DEFAULT_FLOORPLAN,
      tables: (parsed.tables ?? INITIAL_TABLES).map(normalizeTable)
    };
  } catch {
    return fallback;
  }
}

function PanoramaViewer({ src, alt }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState(src ? "loading" : "missing");

  useEffect(() => {
    if (!src) {
      setStatus("missing");
      return undefined;
    }

    setStatus("loading");
    const container = containerRef.current;

    if (!container) {
      return undefined;
    }

    let animationFrame = 0;
    let disposed = false;
    let isPointerDown = false;
    let pointerX = 0;
    let pointerY = 0;
    let lon = 18;
    let lat = 0;
    let renderer = null;
    let geometry = null;
    let material = null;
    let resizeObserver = null;

    const scene = new Scene();
    const camera = new PerspectiveCamera(72, 1, 1, 1100);
    const target = new Vector3();

    const syncSize = () => {
      if (!renderer || !container) {
        return;
      }

      const width = container.clientWidth || 1;
      const height = container.clientHeight || 1;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const renderFrame = () => {
      if (disposed || !renderer) {
        return;
      }

      lat = Math.max(-85, Math.min(85, lat));
      const phi = MathUtils.degToRad(90 - lat);
      const theta = MathUtils.degToRad(lon);

      target.set(
        500 * Math.sin(phi) * Math.cos(theta),
        500 * Math.cos(phi),
        500 * Math.sin(phi) * Math.sin(theta)
      );

      camera.lookAt(target);
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(renderFrame);
    };

    const onPointerDown = (event) => {
      isPointerDown = true;
      pointerX = event.clientX;
      pointerY = event.clientY;
      container.style.cursor = "grabbing";
    };

    const onPointerMove = (event) => {
      if (!isPointerDown) {
        return;
      }

      const deltaX = event.clientX - pointerX;
      const deltaY = event.clientY - pointerY;

      lon -= deltaX * 0.12;
      lat += deltaY * 0.12;
      pointerX = event.clientX;
      pointerY = event.clientY;
    };

    const onPointerUp = () => {
      isPointerDown = false;
      container.style.cursor = "grab";
    };

    const onWheel = (event) => {
      event.preventDefault();
      camera.fov = Math.max(35, Math.min(90, camera.fov + event.deltaY * 0.03));
      camera.updateProjectionMatrix();
    };

    renderer = new WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    container.style.cursor = "grab";
    syncSize();

    geometry = new SphereGeometry(500, 72, 48);
    geometry.scale(-1, 1, 1);

    const loader = new TextureLoader();
    loader.load(
      src,
      (texture) => {
        if (disposed) {
          texture.dispose();
          return;
        }

        material = new MeshBasicMaterial({ map: texture });
        scene.add(new Mesh(geometry, material));
        setStatus("ready");
        renderFrame();
      },
      undefined,
      () => {
        if (!disposed) {
          setStatus("missing");
        }
      }
    );

    container.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    container.addEventListener("wheel", onWheel, { passive: false });
    resizeObserver = new ResizeObserver(syncSize);
    resizeObserver.observe(container);

    return () => {
      disposed = true;

      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      container.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      container.removeEventListener("wheel", onWheel);
      geometry?.dispose();
      material?.map?.dispose();
      material?.dispose();
      renderer?.dispose();
      container.innerHTML = "";
    };
  }, [src]);

  if (status === "missing") {
    return (
      <div className="viewer viewer--placeholder">
        <div>
          <p className="viewer__eyebrow">360 Preview Pending</p>
          <h3>{alt}</h3>
          <p>Upload a panorama from the admin page to activate this table preview.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="viewer-shell">
      {status === "loading" && (
        <div className="viewer-overlay viewer viewer--placeholder">
          <div>
            <p className="viewer__eyebrow">Loading Scene</p>
            <h3>{alt}</h3>
            <p>Preparing the immersive table preview.</p>
          </div>
        </div>
      )}
      <div
        aria-label={alt}
        className={`viewer ${status === "ready" ? "viewer--ready" : "viewer--loading"}`}
        ref={containerRef}
      />
    </div>
  );
}

function useHashRoute() {
  const getRoute = () => window.location.hash || "#/";
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHashChange);

    if (!window.location.hash) {
      window.location.hash = "#/";
    }

    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  return route;
}

function FloorplanStage({
  floorplan,
  tables,
  activeTableId,
  onTableClick,
  onCanvasClick,
  stageRef,
  adminMode = false,
  onTablePointerDown
}) {
  return (
    <div
      className={adminMode ? "floorplan-stage floorplan-stage--admin" : "floorplan-stage"}
      onClick={onCanvasClick}
      ref={stageRef}
      style={{ aspectRatio: `${floorplan.width} / ${floorplan.height}` }}
    >
      <div className="floorplan-grid" />
      {tables.map((table) => (
        <button
          className={
            activeTableId === table.id
              ? `table-node table-node--${table.shape} table-node--active`
              : `table-node table-node--${table.shape}`
          }
          key={table.id}
          onClick={(event) => {
            event.stopPropagation();
            onTableClick?.(table.id);
          }}
          onPointerDown={
            adminMode
              ? (event) => {
                  event.stopPropagation();
                  onTablePointerDown?.(event, table.id);
                }
              : undefined
          }
          style={{
            left: `${(table.x / floorplan.width) * 100}%`,
            top: `${(table.y / floorplan.height) * 100}%`,
            width: `${(table.width / floorplan.width) * 100}%`,
            height: `${(table.height / floorplan.height) * 100}%`
          }}
          type="button"
        >
          <span className="table-node__surface" />
          {getSeatMarkers(table).map((marker, index) => (
            <span
              className="table-node__seat"
              key={`${table.id}-seat-${index}`}
              style={{ left: marker.left, top: marker.top }}
            />
          ))}
          {adminMode && <span className="table-node__name">{table.name}</span>}
        </button>
      ))}
    </div>
  );
}

function HomePage({ floorplan, tables, activeTable, onOpenTable, onCloseTable, onReserveTable }) {
  const [reservation, setReservation] = useState({
    guestCount: "1",
    time: "",
    name: "",
    phone: "",
    email: "",
    note: ""
  });
  const [reservationStatus, setReservationStatus] = useState("");

  useEffect(() => {
    if (!activeTable) {
      setReservation({
        guestCount: "1",
        time: "",
        name: "",
        phone: "",
        email: "",
        note: ""
      });
      setReservationStatus("");
      return;
    }

    setReservation({
      guestCount: "1",
      time: activeTable.availableTimes?.[0] ?? "",
      name: "",
      phone: "",
      email: "",
      note: ""
    });
    setReservationStatus("");
  }, [activeTable]);

  const handleReservationSubmit = (event) => {
    event.preventDefault();

    if (!activeTable || !reservation.time || !reservation.name.trim() || !reservation.phone.trim()) {
      setReservationStatus("Please complete name, phone number, and a time slot.");
      return;
    }

    onReserveTable(activeTable.id, reservation);
    setReservationStatus(`Reserved ${activeTable.name} for ${reservation.guestCount} guest(s) at ${reservation.time}.`);
    setReservation((current) => ({
      ...current,
      time: "",
      name: "",
      phone: "",
      email: "",
      note: ""
    }));
  };

  return (
    <main className="home-page">
      <section className="forplan-card">
        <div className="section-bar">
          <div>
            <p className="eyebrow">Home Focus</p>
            <h2>Restaurant Forplan</h2>
          </div>
          <p className="section-copy">
            Click a highlighted table to open its 360 view and reservation details.
          </p>
        </div>

        <div className="forplan-stage-layout">
          <div className={activeTable ? "forplan-room forplan-room--viewer" : "forplan-room"}>
            {activeTable ? (
              <PanoramaViewer
                alt={`${activeTable.name} 360-degree dining view`}
                src={activeTable.image}
              />
            ) : (
              <FloorplanStage
                activeTableId={activeTable?.id}
                floorplan={floorplan}
                onTableClick={(tableId) => onOpenTable(tables.find((table) => table.id === tableId))}
                tables={tables}
              />
            )}
          </div>

          <aside className="preview-panel">
            <div className="preview-copy">
              <div className="preview-header">
                <p className="eyebrow">{activeTable ? "Selected Table" : "Reservation Info"}</p>
                {activeTable && (
                  <button className="close-preview close-preview--panel" onClick={onCloseTable} type="button">
                    X
                  </button>
                )}
              </div>
              <h3>{activeTable ? activeTable.name : "Choose a table"}</h3>
              <p>{activeTable ? `${activeTable.seats} guests` : "Tap a highlighted table on the floorplan."}</p>
              <p>
                {activeTable
                  ? activeTable.description || "Add a table description from the admin page."
                  : "The 360 view will open in the main panel."}
              </p>
              <p className="preview-hours">
                {activeTable ? activeTable.hours : "Available hours will appear here."}
              </p>
              {activeTable && (
                <form className="reservation-form" onSubmit={handleReservationSubmit}>
                  <div className="reservation-form__header">
                    <p className="eyebrow">Reserve Table</p>
                    <span>{activeTable.availableTimes?.length ?? 0} slots left</span>
                  </div>

                  <label className="field field--compact">
                    <span>Reserve For</span>
                    <select
                      onChange={(event) => setReservation((current) => ({ ...current, guestCount: event.target.value }))}
                      value={reservation.guestCount}
                    >
                      {Array.from({ length: activeTable.seats }, (_, index) => index + 1).map((count) => (
                        <option key={count} value={count}>
                          {count} guest{count > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field field--compact">
                    <span>Time</span>
                    <select
                      onChange={(event) => setReservation((current) => ({ ...current, time: event.target.value }))}
                      value={reservation.time}
                    >
                      <option value="">Select a time</option>
                      {(activeTable.availableTimes ?? []).map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field field--compact">
                    <span>Name</span>
                    <input
                      onChange={(event) => setReservation((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Guest name"
                      type="text"
                      value={reservation.name}
                    />
                  </label>

                  <label className="field field--compact">
                    <span>Phone Number</span>
                    <input
                      onChange={(event) => setReservation((current) => ({ ...current, phone: event.target.value }))}
                      placeholder="Phone number"
                      type="tel"
                      value={reservation.phone}
                    />
                  </label>

                  <label className="field field--compact">
                    <span>Email Optional</span>
                    <input
                      onChange={(event) => setReservation((current) => ({ ...current, email: event.target.value }))}
                      placeholder="Email address"
                      type="email"
                      value={reservation.email}
                    />
                  </label>

                  <label className="field field--compact">
                    <span>Note</span>
                    <textarea
                      onChange={(event) => setReservation((current) => ({ ...current, note: event.target.value }))}
                      placeholder="Optional seating note"
                      rows="3"
                      value={reservation.note}
                    />
                  </label>

                  <button
                    className="primary-button"
                    disabled={!activeTable.availableTimes?.length}
                    type="submit"
                  >
                    Confirm Reservation
                  </button>

                  {reservationStatus && <p className="reservation-feedback">{reservationStatus}</p>}
                </form>
              )}
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function InfoPage({ title, eyebrow, description }) {
  return (
    <main className="sub-page">
      <section className="page-card">
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="hero-copy">{description}</p>
      </section>
    </main>
  );
}

function MenuPage() {
  return (
    <main className="sub-page">
      <section className="menu-page-card">
        <div className="menu-page__frame menu-page__frame--top-left" />
        <div className="menu-page__frame menu-page__frame--top-right" />
        <div className="menu-page__frame menu-page__frame--bottom-left" />
        <div className="menu-page__frame menu-page__frame--bottom-right" />

        <div className="menu-page__hero">
          <p className="menu-page__brand">Demo Restaurant</p>
          <h1>Food Menu</h1>
          <div className="menu-page__divider">
            <span />
            <i />
            <span />
          </div>
        </div>

        <div className="menu-page__grid">
          {menuSections.map((section) => (
            <section className="menu-section" key={section.title}>
              <h2>{section.title}</h2>
              <div className="menu-section__list">
                {section.items.map((item) => (
                  <article className="menu-item" key={item.name}>
                    <div className="menu-item__row">
                      <h3>{item.name}</h3>
                      <span className="menu-item__dots" />
                      <strong>{item.price}</strong>
                    </div>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <p className="menu-page__footer">12 Anywhere St., Any City, ST 12345</p>
      </section>
    </main>
  );
}

function ContactPage() {
  return (
    <main className="sub-page">
      <section className="contact-page-card">
        <div className="contact-page__hero">
          <p className="eyebrow">Contact</p>
          <h1>Reservations And Reach Out</h1>
          <p className="hero-copy">
            Call, email, or send a WhatsApp message from your phone to book a table faster.
          </p>
        </div>

        <div className="contact-page__grid">
          <div className="contact-panel">
            <p className="contact-panel__label">Phone</p>
            <a className="contact-panel__value" href={contactDetails.phoneHref}>
              {contactDetails.phoneDisplay}
            </a>
            <p className="contact-panel__hint">Tap to call the restaurant directly.</p>
          </div>

          <div className="contact-panel">
            <p className="contact-panel__label">Email</p>
            <a className="contact-panel__value" href={`mailto:${contactDetails.email}`}>
              {contactDetails.email}
            </a>
            <p className="contact-panel__hint">Use email for private events or larger groups.</p>
          </div>

          <div className="contact-panel contact-panel--wide">
            <p className="contact-panel__label">WhatsApp</p>
            <a
              className="contact-cta"
              href={contactDetails.whatsappHref}
              rel="noreferrer"
              target="_blank"
            >
              Message Us On WhatsApp
            </a>
            <p className="contact-panel__hint">
              Best for mobile users who want to send a quick reservation message.
            </p>
          </div>
        </div>

        <div className="contact-meta">
          <div className="contact-meta__item">
            <p className="contact-panel__label">Address</p>
            <p>{contactDetails.address}</p>
          </div>
          <div className="contact-meta__item">
            <p className="contact-panel__label">Hours</p>
            <p>{contactDetails.hours}</p>
          </div>
        </div>
      </section>
    </main>
  );
}

function AdminPage({
  floorplan,
  tables,
  onFloorplanChange,
  onAddTable,
  onUpdateTable,
  onRemoveTable,
  onSave,
  onReset
}) {
  const [placementType, setPlacementType] = useState(TABLE_LIBRARY[0].type);
  const [selectedTableId, setSelectedTableId] = useState(tables[0]?.id ?? null);
  const [dragState, setDragState] = useState(null);
  const stageRef = useRef(null);

  const selectedTable = tables.find((table) => table.id === selectedTableId) ?? null;

  useEffect(() => {
    if (!selectedTableId && tables[0]) {
      setSelectedTableId(tables[0].id);
    }

    if (selectedTableId && !tables.some((table) => table.id === selectedTableId)) {
      setSelectedTableId(tables[0]?.id ?? null);
    }
  }, [selectedTableId, tables]);

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    const onPointerMove = (event) => {
      const stage = stageRef.current;
      const table = tables.find((item) => item.id === dragState.tableId);

      if (!stage || !table) {
        return;
      }

      const rect = stage.getBoundingClientRect();
      const nextX = ((event.clientX - rect.left) / rect.width) * floorplan.width - dragState.offsetX;
      const nextY = ((event.clientY - rect.top) / rect.height) * floorplan.height - dragState.offsetY;

      onUpdateTable(dragState.tableId, {
        x: clamp(nextX, table.width / 2, floorplan.width - table.width / 2),
        y: clamp(nextY, table.height / 2, floorplan.height - table.height / 2)
      });
    };

    const onPointerUp = () => setDragState(null);

    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [dragState, floorplan.height, floorplan.width, onUpdateTable, tables]);

  const handleCanvasClick = (event) => {
    const stage = stageRef.current;

    if (!stage) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const preset = getTablePreset(placementType);
    const rawX = ((event.clientX - rect.left) / rect.width) * floorplan.width;
    const rawY = ((event.clientY - rect.top) / rect.height) * floorplan.height;
    const table = makeTable(
      placementType,
      clamp(rawX, preset.width / 2, floorplan.width - preset.width / 2),
      clamp(rawY, preset.height / 2, floorplan.height - preset.height / 2),
      tables.length + 1
    );

    onAddTable(table);
    setSelectedTableId(table.id);
  };

  const handleTablePointerDown = (event, tableId) => {
    const stage = stageRef.current;
    const table = tables.find((item) => item.id === tableId);

    if (!stage || !table) {
      return;
    }

    const rect = stage.getBoundingClientRect();
    const pointerX = ((event.clientX - rect.left) / rect.width) * floorplan.width;
    const pointerY = ((event.clientY - rect.top) / rect.height) * floorplan.height;

    setSelectedTableId(tableId);
    setDragState({
      tableId,
      offsetX: pointerX - table.x,
      offsetY: pointerY - table.y
    });
  };

  const handleImageUpload = (file) => {
    if (!file || !selectedTable) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onUpdateTable(selectedTable.id, { image: typeof reader.result === "string" ? reader.result : "" });
    };
    reader.readAsDataURL(file);
  };

  return (
    <main className="sub-page">
      <section className="admin-page-card">
        <div className="admin-page__hero">
          <div>
            <p className="eyebrow">Admin Studio</p>
            <h1>Floorplan Control Room</h1>
          </div>
          <div className="admin-page__hero-actions">
            <p className="section-copy">
              Place tables, resize the plan, upload 360 scenes, and manage table copy from one workspace.
            </p>
            <div className="admin-actions">
              <button className="secondary-button" onClick={onReset} type="button">
                Reset Draft
              </button>
              <button className="primary-button" onClick={onSave} type="button">
                Save Floorplan
              </button>
            </div>
          </div>
        </div>

        <div className="admin-page__layout">
          <section className="admin-board">
            <div className="admin-board__header">
              <div>
                <p className="admin-board__label">Live Floorplan</p>
                <h2>{floorplan.width}px by {floorplan.height}px</h2>
              </div>
              <p className="admin-board__hint">Choose a table type, then click the plan to place it. Drag placed tables to reposition them.</p>
            </div>

            <FloorplanStage
              activeTableId={selectedTableId}
              adminMode
              floorplan={floorplan}
              onCanvasClick={handleCanvasClick}
              onTableClick={setSelectedTableId}
              onTablePointerDown={handleTablePointerDown}
              stageRef={stageRef}
              tables={tables}
            />
          </section>

          <aside className="admin-sidebar">
            <section className="admin-panel">
              <div className="admin-panel__header">
                <p className="eyebrow">Floorplan Size</p>
                <h3>Canvas Settings</h3>
              </div>
              <div className="admin-grid">
                <label className="field">
                  <span>Width</span>
                  <input
                    min="320"
                    onChange={(event) => onFloorplanChange({ width: Number(event.target.value) || DEFAULT_FLOORPLAN.width })}
                    type="number"
                    value={floorplan.width}
                  />
                </label>
                <label className="field">
                  <span>Height</span>
                  <input
                    min="320"
                    onChange={(event) => onFloorplanChange({ height: Number(event.target.value) || DEFAULT_FLOORPLAN.height })}
                    type="number"
                    value={floorplan.height}
                  />
                </label>
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel__header">
                <p className="eyebrow">Table Library</p>
                <h3>Placement Palette</h3>
              </div>
              <div className="table-palette">
                {TABLE_LIBRARY.map((preset) => (
                  <button
                    className={placementType === preset.type ? "palette-card palette-card--active" : "palette-card"}
                    key={preset.type}
                    onClick={() => setPlacementType(preset.type)}
                    type="button"
                  >
                    <strong>{preset.seats} Seats</strong>
                    <span>{preset.shape === "round" ? "Round layout" : "Long shared table"}</span>
                  </button>
                ))}
              </div>
            </section>

            <section className="admin-panel">
              <div className="admin-panel__header">
                <p className="eyebrow">Selected Table</p>
                <h3>{selectedTable ? selectedTable.name : "Choose Or Place A Table"}</h3>
              </div>

              {selectedTable ? (
                <div className="editor-stack">
                  <div className="admin-grid">
                    <label className="field">
                      <span>Name</span>
                      <input
                        onChange={(event) => onUpdateTable(selectedTable.id, { name: event.target.value })}
                        type="text"
                        value={selectedTable.name}
                      />
                    </label>
                    <label className="field">
                      <span>Seats</span>
                      <input
                        onChange={(event) =>
                          onUpdateTable(selectedTable.id, {
                            seats: Number(event.target.value) || selectedTable.seats
                          })
                        }
                        type="number"
                        value={selectedTable.seats}
                      />
                    </label>
                  </div>

                  <div className="admin-grid">
                    <label className="field">
                      <span>X Position</span>
                      <input
                        max={floorplan.width}
                        min="0"
                        onChange={(event) =>
                          onUpdateTable(selectedTable.id, {
                            x: clamp(Number(event.target.value) || 0, 0, floorplan.width)
                          })
                        }
                        type="number"
                        value={Math.round(selectedTable.x)}
                      />
                    </label>
                    <label className="field">
                      <span>Y Position</span>
                      <input
                        max={floorplan.height}
                        min="0"
                        onChange={(event) =>
                          onUpdateTable(selectedTable.id, {
                            y: clamp(Number(event.target.value) || 0, 0, floorplan.height)
                          })
                        }
                        type="number"
                        value={Math.round(selectedTable.y)}
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>Description</span>
                    <textarea
                      onChange={(event) => onUpdateTable(selectedTable.id, { description: event.target.value })}
                      rows="4"
                      value={selectedTable.description}
                    />
                  </label>

                  <label className="field">
                    <span>Availability Notes</span>
                    <input
                      onChange={(event) => {
                        const availableTimes = parseAvailableTimes(event.target.value);
                        onUpdateTable(selectedTable.id, {
                          availableTimes,
                          hours: formatAvailableHours(availableTimes)
                        });
                      }}
                      type="text"
                      value={selectedTable.hours}
                    />
                  </label>

                  <label className="field">
                    <span>Upload 360 Image</span>
                    <input
                      accept="image/*"
                      onChange={(event) => handleImageUpload(event.target.files?.[0])}
                      type="file"
                    />
                  </label>

                  {selectedTable.image && (
                    <div className="upload-status">360 image attached and ready for the public view.</div>
                  )}

                  <button className="danger-button" onClick={() => onRemoveTable(selectedTable.id)} type="button">
                    Remove Table
                  </button>
                </div>
              ) : (
                <p className="admin-empty">
                  Start by placing a table from the palette, then edit its copy, image, and position here.
                </p>
              )}
            </section>
          </aside>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const route = useHashRoute();
  const initialAdminState = loadAdminState();
  const [floorplan, setFloorplan] = useState(initialAdminState.floorplan);
  const [tables, setTables] = useState(initialAdminState.tables);
  const [activeTableId, setActiveTableId] = useState(null);

  const persistState = (nextFloorplan, nextTables) => {
    window.localStorage.setItem(
      ADMIN_STORAGE_KEY,
      JSON.stringify({
        floorplan: nextFloorplan,
        tables: nextTables.map(normalizeTable)
      })
    );
  };

  const handleSaveAdminState = () => {
    persistState(floorplan, tables);
  };

  const handleResetAdminState = () => {
    setFloorplan(DEFAULT_FLOORPLAN);
    setTables(INITIAL_TABLES.map(normalizeTable));
    setActiveTableId(null);
    window.localStorage.removeItem(ADMIN_STORAGE_KEY);
  };

  const handleReserveTable = (tableId, reservation) => {
    const nextTables = tables.map((table) => {
      if (table.id !== tableId) {
        return table;
      }

      const availableTimes = (table.availableTimes ?? []).filter((time) => time !== reservation.time);

      return normalizeTable({
        ...table,
        availableTimes,
        lastReservation: {
          guestCount: reservation.guestCount,
          time: reservation.time,
          name: reservation.name,
          phone: reservation.phone,
          email: reservation.email,
          note: reservation.note
        }
      });
    });

    setTables(nextTables);
    persistState(floorplan, nextTables);
  };

  useEffect(() => {
    if (route !== "#/") {
      setActiveTableId(null);
    }
  }, [route]);

  useEffect(() => {
    if (activeTableId && !tables.some((table) => table.id === activeTableId)) {
      setActiveTableId(null);
    }
  }, [activeTableId, tables]);

  const activeTable = tables.find((table) => table.id === activeTableId) ?? null;

  const pageMap = {
    "#/": (
      <HomePage
        activeTable={activeTable}
        floorplan={floorplan}
        onOpenTable={(table) => setActiveTableId(table.id)}
        onCloseTable={() => setActiveTableId(null)}
        onReserveTable={handleReserveTable}
        tables={tables}
      />
    ),
    "#/menu": (
      <MenuPage />
    ),
    "#/blog": (
      <InfoPage
        eyebrow="Blog"
        title="Blog page ready for stories and updates."
        description="Use this page for chef notes, seasonal announcements, event nights, and restaurant news."
      />
    ),
    "#/contact": (
      <ContactPage />
    ),
    "#/admin": (
      <AdminPage
        floorplan={floorplan}
        onAddTable={(table) => setTables((current) => [...current, table])}
        onFloorplanChange={(patch) =>
          setFloorplan((current) => ({
            ...current,
            ...patch
          }))
        }
        onRemoveTable={(tableId) => setTables((current) => current.filter((table) => table.id !== tableId))}
        onReset={handleResetAdminState}
        onSave={handleSaveAdminState}
        onUpdateTable={(tableId, patch) =>
          setTables((current) =>
            current.map((table) =>
              table.id === tableId
                ? {
                    ...table,
                    ...patch
                  }
                : table
            )
          )
        }
        tables={tables}
      />
    )
  };

  return (
    <div className="app-shell">
      <header className="header-shell">
        <nav className="nav">
          <a className="brand" href="#/" onClick={() => setActiveTableId(null)}>
            <span className="brand__badge">Demo</span>
            <span className="brand__subcopy">sme logo</span>
          </a>
          <div className="nav__links">
            {navItems.map((item) => (
              <a
                className={route === item.hash ? "nav-link nav-link--active" : "nav-link"}
                href={item.hash}
                key={item.id}
                onClick={item.hash === "#/" ? () => setActiveTableId(null) : undefined}
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      </header>

      {route === "#/admin" && (
        <section className="admin-route-banner">
          <p className="eyebrow">Admin Route</p>
          <strong>Admin editor is active at `#/admin`.</strong>
        </section>
      )}

      {pageMap[route] ?? pageMap["#/"]}

      <footer className="footer">
        <p>Footer</p>
      </footer>
    </div>
  );
}
