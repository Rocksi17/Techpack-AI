"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { Document, Page, pdfjs } from "react-pdf";
import React from "react";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

import { useSearchParams } from "next/navigation";
import { db } from "@/lib/firebase";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  BringToFront,
  ChevronDown,
  Copy,
  Download,
  FileText,
  Layers,
  Minus,
  MousePointer2,
  Move,
  PenLine,
  Plus,
  Redo2,
  RotateCcw,
  RotateCw,
  Save,
  SendToBack,
  Shapes,
  Slash,
  Table,
  Trash2,
  Type,
  Undo2,
  Upload,
  X,
} from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const TOP_BUTTON =
  "h-10 px-3 rounded-xl flex items-center gap-2 text-sm font-semibold text-slate-200 hover:bg-slate-100 transition";

const FLOAT_BUTTON = `
  w-10
  h-10
  rounded-xl

  flex
  items-center
  justify-center

  text-blue-300

  hover:bg-violet-500/20
  hover:text-white

  transition
`

const TOOL_BUTTON =
  "w-14 h-14 rounded-2xl flex items-center justify-center transition text-slate-200 hover:bg-slate-100";

const PANEL_BUTTON =
  "w-20 h-16 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition";

export default function PDFViewer() {
  const [pdf, setPdf] = useState("");
  const [numPages, setNumPages] = useState(0);

  const [texts, setTexts] = useState([]);
  const [images, setImages] = useState([]);
  const [arrows, setArrows] = useState([]);
  const [lines, setLines] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [measureStroke, setMeasureStroke] = useState(5);
  const [measureOpacity, setMeasureOpacity] = useState(1);
  const [boxes, setBoxes] = useState([]);

  const [selectedObject, setSelectedObject] = useState(null);
  const [selectedItems, setSelectedItems] = useState([]);

  const [selectedColor, setSelectedColor] = useState("#8b5cf6");
  const [fontSize, setFontSize] = useState(18);
  const [lineStyle, setLineStyle] = useState("solid");
  const [boldText, setBoldText] = useState(false);

  const [tool, setTool] = useState("select");
  const [activePanel, setActivePanel] = useState(null);
  const [arrowType, setArrowType] = useState("normal");
  const [lineType, setLineType] = useState("measure");

  const [zoom, setZoom] = useState(1);
  const [history, setHistory] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [imageDropPosition, setImageDropPosition] = useState({ x: 150, y: 150 });
  const [selectionBox, setSelectionBox] = useState(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [guides, setGuides] = useState([]);
  const [clipboard, setClipboard] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("Saved");
  const [showLayers, setShowLayers] = useState(false);


  const [strokeWidth, setStrokeWidth] = useState(4);
const [lineStart, setLineStart] = useState("none");
const [lineEnd, setLineEnd] = useState("none");
const [lineOpacity, setLineOpacity] = useState(1);
const [lineCapRound, setLineCapRound] = useState(false);
const [lineDash, setLineDash] = useState("solid");
const [linePopup, setLinePopup] = useState(null);
const [lineEditing, setLineEditing] = useState(false);
const [shapeType, setShapeType] = useState("square");
const [fontFamily, setFontFamily] = useState("Arial");
const [drawType, setDrawType] = useState("penBlue");
const [drawings, setDrawings] = useState([]);
const [isDrawing, setIsDrawing] = useState(false);
const [drawWeight, setDrawWeight] = useState(3);
const [drawOpacity, setDrawOpacity] = useState(1);
const [eraserWeight, setEraserWeight] = useState(24);
const [showDrawSettings, setShowDrawSettings] = useState(false);
const [drawCursor, setDrawCursor] = useState(null);
const [pages, setPages] = useState([
  {
    id: 1,
    type: "pdf",
    pdfPage: 1,
  },
]);

const selectedTextStyle =
  texts.find(
    (t) => t.id === selectedObject?.id
  );
const [currentPage, setCurrentPage] = useState(0);
const [showPageTray, setShowPageTray] = useState(false);

const [showColorPicker, setShowColorPicker] = useState(false);
const [customColors, setCustomColors] = useState([]);
const [pickerPos, setPickerPos] = useState({ x: 80, y: 20 });
const [hue, setHue] = useState(240);
const [colorLight, setColorLight] = useState(60);
const [measureType, setMeasureType] = useState("dots"); 


const COLORS = {
  bg: "#060816",
  panel: "#0f172a",
  border: "rgba(139,92,246,0.18)",

  primary: "#7c3aed",
  primaryGlow: "#9333ea",

  blue: "#2563eb",
  cyan: "#06b6d4",

  text: "#f8fafc",
  muted: "#94a3b8",
};

const FONT_OPTIONS = [
  "Arial",
  "Helvetica",
  "Times New Roman",
  "Georgia",
  "Courier New",
  "Verdana",
  "Trebuchet MS",
  "Impact",
  "Comic Sans MS",
  "Palatino Linotype",
  "Lucida Console",
  "Tahoma",
  "Gill Sans",
  "Futura",
  "Brush Script MT",
];

  const fileInputRef = useRef(null);
  const pdfInputRef = useRef(null);
  const pdfRef = useRef(null);
  const selectionStartRef = useRef(null);
  const groupDragStartRef = useRef([]);
  const dragStartRef = useRef(null);
  const exportingRef = useRef(false);
  const pageRefs = useRef([]);

  const searchParams = useSearchParams();
  const urlProjectId = searchParams.get("id");
  const SNAP_DISTANCE = 8;

  const allObjects = useMemo(
    () => [
      ...texts.map((o) => ({ ...o, kind: "text" })),
      ...images.map((o) => ({ ...o, kind: "image" })),
      ...arrows.map((o) => ({ ...o, kind: "arrow" })),
      ...lines.map((o) => ({ ...o, kind: "line" })),
      ...measurements.map((o) => ({ ...o, kind: "measurement" })),
      ...boxes.map((o) => ({ ...o, kind: "box" })),
    ],
    [texts, images, arrows, lines, measurements, boxes]
  );

  const selectedFullObject = useMemo(() => {
    if (!selectedObject) return null;
    return allObjects.find(
      (obj) => obj.kind === selectedObject.type && obj.id === selectedObject.id
    );
  }, [selectedObject, allObjects]);

function hsvToHex(h, s, v) {
  s /= 100;
  v /= 100;

  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;

  let r = 0, g = 0, b = 0;

  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return (
    "#" +
    [r, g, b]
      .map((n) => Math.round((n + m) * 255).toString(16).padStart(2, "0"))
      .join("")
  );
}

function updatePickerColor(x, y, h = hue) {
  const sat = Math.round(x);
  const value = Math.round(100 - y);

  const color = hsvToHex(h, sat, value);

  setPickerPos({ x, y });
  setSelectedColor(color);
}

  function fileToBase64(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsDataURL(file);
    });
  }

  function getKind(item) {
    if (item.kind) return item.kind;
    if (item.src !== undefined) return "image";
    if (item.borderWidth !== undefined) return "box";
    if (item.type && ["normal", "double", "lshape", "curve"].includes(item.type)) return "arrow";
    if (

  item.type &&

  ["plain", "curve", "lshape"].includes(item.type)

)

  return "line";
    if (item.text !== undefined && item.rotation !== undefined) return "measurement";
    return "text";
  }

  function getAllObjects() {
    return allObjects;
  }

  function isSelected(type, id) {
    return selectedItems.some((item) => item.type === type && item.id === id);
  }

  function saveHistory() {
  setHistory((prev) => [
    ...prev,
    {
      texts,
      images,
      arrows,
      lines,
      measurements,
      boxes,
      drawings,
      pages,
      currentPage,
    },
  ]);
  setRedoStack([]);
}

  function restoreState(state) {
  setTexts(state.texts || []);
  setImages(state.images || []);
  setArrows(state.arrows || []);
  setLines(state.lines || []);
  setMeasurements(state.measurements || []);
  setBoxes(state.boxes || []);
  setDrawings(state.drawings || []);
  setPages(state.pages || []);
  setCurrentPage(state.currentPage || 0);
}

  function undo() {
  if (!history.length) return;

  const previous = history[history.length - 1];

  setRedoStack((prev) => [
    ...prev,
    {
      texts,
      images,
      arrows,
      lines,
      measurements,
      boxes,
      drawings,
      pages,
      currentPage,
    },
  ]);

  restoreState(previous);
  setHistory((prev) => prev.slice(0, -1));
}

  function redo() {
  if (!redoStack.length) return;

  const next = redoStack[redoStack.length - 1];

  setHistory((prev) => [
    ...prev,
    {
      texts,
      images,
      arrows,
      lines,
      measurements,
      boxes,
      drawings,
      pages,
      currentPage,
    },
  ]);

  restoreState(next);
  setRedoStack((prev) => prev.slice(0, -1));
}

  function updateObjectByType(type, updater) {
    if (type === "text") setTexts((prev) => prev.map(updater));
    if (type === "image") setImages((prev) => prev.map(updater));
    if (type === "arrow") setArrows((prev) => prev.map(updater));
    if (type === "line") setLines((prev) => prev.map(updater));
    if (type === "measurement") setMeasurements((prev) => prev.map(updater));
    if (type === "box") setBoxes((prev) => prev.map(updater));
  }

  function addObjectByType(item) {
    const kind = getKind(item);
    const clean = { ...item };
    delete clean.kind;
    delete clean.objectType;

    if (kind === "text") setTexts((prev) => [...prev, clean]);
    if (kind === "image") setImages((prev) => [...prev, clean]);
    if (kind === "arrow") setArrows((prev) => [...prev, clean]);
    if (kind === "line") setLines((prev) => [...prev, clean]);
    if (kind === "measurement") setMeasurements((prev) => [...prev, clean]);
    if (kind === "box") setBoxes((prev) => [...prev, clean]);
  }

  function copySelected() {
    const copied = getAllObjects()
      .filter((obj) => selectedItems.some((s) => s.id === obj.id && s.type === obj.kind))
      .map((obj) => {
        const { kind, ...cleanObj } = obj;
        return cleanObj;
      });

    setClipboard(copied);
  }

  function pasteClipboard() {
    if (!clipboard.length) return;
    saveHistory();

    const duplicated = clipboard.map((item, index) => ({
      ...item,
      id: Date.now() + index + Math.random(),
      x: (item.x || 0) + 40,
      y: (item.y || 0) + 40,
      zIndex: (item.zIndex || 50) + 1,
    }));

    duplicated.forEach(addObjectByType);
    const selected = duplicated.map((item) => ({ type: getKind(item), id: item.id }));
    setSelectedItems(selected);
    setSelectedObject(selected[0] || null);
  }

  function duplicateSelected() {
    if (!selectedItems.length) return;
    const selectedObjects = getAllObjects().filter((obj) =>
            selectedItems.some((s) => s.id === obj.id && s.type === obj.kind)
    );

    if (!selectedObjects.length) return;

    saveHistory();

    const duplicated = selectedObjects.map((item, index) => {
      const { kind, ...cleanItem } = item;

      return {
        ...cleanItem,
        id: Date.now() + index + Math.random(),
        x: item.x + 40,
        y: item.y + 40,
        zIndex: (item.zIndex || 50) + 1,
      };
    });

    duplicated.forEach(addObjectByType);

    const selected = duplicated.map((item) => ({
      type: getKind(item),
      id: item.id,
    }));

    setSelectedItems(selected);
    setSelectedObject(selected[0] || null);
  }

  function deleteSelected() {
    if (!selectedItems.length) return;

    saveHistory();

    setTexts((prev) =>
      prev.filter(
        (item) =>
          !selectedItems.some(
            (s) => s.type === "text" && s.id === item.id
          )
      )
    );

    setImages((prev) =>
      prev.filter(
        (item) =>
          !selectedItems.some(
            (s) => s.type === "image" && s.id === item.id
          )
      )
    );

    setArrows((prev) =>
      prev.filter(
        (item) =>
          !selectedItems.some(
            (s) => s.type === "arrow" && s.id === item.id
          )
      )
    );

    setLines((prev) =>
      prev.filter(
        (item) =>
          !selectedItems.some(
            (s) => s.type === "line" && s.id === item.id
          )
      )
    );

    setMeasurements((prev) =>
      prev.filter(
        (item) =>
          !selectedItems.some(
            (s) => s.type === "measurement" && s.id === item.id
          )
      )
    );

    setBoxes((prev) =>
      prev.filter(
        (item) =>
          !selectedItems.some(
            (s) => s.type === "box" && s.id === item.id
          )
      )
    );

    setSelectedObject(null);
    setSelectedItems([]);
  }

  useEffect(() => {
    const tempPdf = localStorage.getItem("tempPdf");

    if (
      tempPdf &&
      tempPdf.startsWith("data:application/pdf")
    ) {
      setPdf(tempPdf);
      localStorage.removeItem("tempPdf");
      return;
    }

    const saved = localStorage.getItem(
      "techpackProject"
    );

    if (!saved) return;

    const projectData = JSON.parse(saved);

    setPdf(projectData.pdf || "");
    setTexts(projectData.texts || []);
    setImages(projectData.images || []);
    setArrows(projectData.arrows || []);
    setLines(projectData.lines || []);
    setMeasurements(projectData.measurements || []);
    setBoxes(projectData.boxes || []);
    setCurrentProjectId(projectData.id || null);
  }, []);

  useEffect(() => {
    const loadFirestoreProject = async () => {
      if (!urlProjectId) return;

      setCurrentProjectId(urlProjectId);

      const snap = await getDoc(
        doc(db, "techpacks", urlProjectId)
      );

      if (!snap.exists()) return;

      const data = snap.data();

      setPdf(
        data.editedPdfUrl ||
          data.pdfUrl ||
          data.pdf ||
          ""
      );

      setTexts(data.texts || []);
      setImages(data.images || []);
      setArrows(data.arrows || []);
      setLines(data.lines || []);
      setMeasurements(data.measurements || []);
      setBoxes(data.boxes || []);
    };

    loadFirestoreProject();
  }, [urlProjectId]);

  function onDocumentLoadSuccess({
    numPages,
  }) {
    setNumPages(numPages);
  }

  async function handlePdfUpload(e) {
    const file = e.target.files?.[0];

    if (!file) return;

    const base64 = await fileToBase64(file);

    setPdf(base64);

    localStorage.setItem(
      "tempPdf",
      base64
    );

    e.target.value = "";
  }

  async function handleImageUpload(e) {
    const files = Array.from(
      e.target.files || []
    );

    if (!files.length) return;

    saveHistory();

    const previewImages = await Promise.all(
      files.map(async (file, index) => ({
        id:
          Date.now() +
          index +
          Math.random(),

        src: await fileToBase64(file),

        x:
          imageDropPosition.x +
          index * 20,

        y:
          imageDropPosition.y +
          index * 20,

        width: 180,
        height: 180,

        page: currentPage,

        rotation: 0,

        flipX: false,
        flipY: false,

        zIndex: 999,
      }))
    );

    setImages((prev) => [
      ...prev,
      ...previewImages,
    ]);

    setSelectedItems(
      previewImages.map((img) => ({
        type: "image",
        id: img.id,
      }))
    );

    setSelectedObject({
      type: "image",
      id: previewImages[0].id,
    });

    e.target.value = "";
  }
    function toggleSelection(type, id, e) {
  if (tool === "draw") return;

  e.stopPropagation();

  setSelectedObject({ type, id });

  if (e.metaKey || e.ctrlKey) {
    setSelectedItems((prev) => {
      const exists = prev.find(
        (item) => item.id === id && item.type === type
      );

      return exists
        ? prev.filter((item) => !(item.id === id && item.type === type))
        : [...prev, { type, id }];
    });
  } else {
    setSelectedItems([{ type, id }]);
  }
}

  function startGroupDrag() {
    groupDragStartRef.current = getAllObjects().map((item) => ({
      type: item.kind,
      id: item.id,
      x: item.x,
      y: item.y,
    }));
  }

  function moveGroupDrag(dx, dy, draggedType, draggedId) {
    const move = (items, type) =>
      items.map((item) => {
        const selected =
          selectedItems.some((s) => s.type === type && s.id === item.id) ||
          (draggedType === type && draggedId === item.id);

        if (!selected) return item;

        const original = groupDragStartRef.current.find(
          (o) => o.type === type && o.id === item.id
        );

        if (!original) return item;

        return {
          ...item,
          x: original.x + dx,
          y: original.y + dy,
        };
      });

    setTexts((p) => move(p, "text"));
    setImages((p) => move(p, "image"));
    setArrows((p) => move(p, "arrow"));
    setLines((p) => move(p, "line"));
    setMeasurements((p) => move(p, "measurement"));
    setBoxes((p) => move(p, "box"));
  }

  function getSnapPosition(x, y, width, height, currentId, currentType) {
    let snapX = x;
    let snapY = y;
    const newGuides = [];

    getAllObjects().forEach((obj) => {
      if (obj.id === currentId && obj.kind === currentType) return;

      if (Math.abs(x - obj.x) < SNAP_DISTANCE) {
        snapX = obj.x;
        newGuides.push({ type: "vertical", x: obj.x });
      }

      if (Math.abs(x + width - (obj.x + obj.width)) < SNAP_DISTANCE) {
        snapX = obj.x + obj.width - width;
        newGuides.push({ type: "vertical", x: obj.x + obj.width });
      }

      if (Math.abs(y - obj.y) < SNAP_DISTANCE) {
        snapY = obj.y;
        newGuides.push({ type: "horizontal", y: obj.y });
      }

      if (Math.abs(y + height - (obj.y + obj.height)) < SNAP_DISTANCE) {
        snapY = obj.y + obj.height - height;
        newGuides.push({ type: "horizontal", y: obj.y + obj.height });
      }
    });

    setGuides(newGuides);

    return { x: snapX, y: snapY };
  }

  function onDragStartCommon(item) {
    dragStartRef.current = {
      x: item.x,
      y: item.y,
    };

    startGroupDrag();
  }

  function onDragStopCommon(d, item, type) {
    saveHistory();

    const snapped = getSnapPosition(
      d.x,
      d.y,
      item.width,
      item.height,
      item.id,
      type
    );

    const dx = snapped.x - dragStartRef.current.x;
    const dy = snapped.y - dragStartRef.current.y;

    moveGroupDrag(dx, dy, type, item.id);

    setGuides([]);
  }

  function getPagePoint(e) {
  const pageBox = e.target.closest(".page-box");
  if (!pageBox) return null;
  const rect = pageBox.getBoundingClientRect();
  const page = Number(pageBox.dataset.pageIndex);
  return {
    page,
    x: (e.clientX - rect.left) / zoom,
    y: (e.clientY - rect.top) / zoom,
    pageBox,
  };
}

    function handlePdfClick(e) {
    if (!pdfRef.current) return;

    const point = getPagePoint(e);
    if (!point) return;

    const { x, y, page } = point;

    setCurrentPage(page);
    setImageDropPosition({ x, y });

    setImageDropPosition({ x, y });

    const clickedToolbar = e.target.closest(".floating-toolbar");

if (!clickedToolbar && e.target === e.currentTarget) {
  setSelectedItems([]);
  setSelectedObject(null);
}

    if (!tool || tool === "select") return;

    if (tool === "draw") return;

    saveHistory();

    if (tool === "text") {
      const newItem = {
        id: Date.now(),
        page,
        text: "Add Text",
        x,
        y,
        width: 220,
        height: 45,
        color: selectedColor,
        
        fontSize,
        fontFamily,
        fontWeight: boldText ? "bold" : "normal",
        zIndex: 50,
      };

      setTexts((prev) => [...prev, newItem]);
      setSelectedObject({ type: "text", id: newItem.id });
      setSelectedItems([{ type: "text", id: newItem.id }]);
    }

    if (tool === "arrow") {
      const newItem = {
        id: Date.now(),
        page,
        x,
        y,
        width: 180,
        height: 100,
        color: selectedColor,
        
        style: lineStyle,
        type: arrowType,
        rotation: 0,
        zIndex: 50,
      };

      setArrows((prev) => [...prev, newItem]);
      setSelectedObject({ type: "arrow", id: newItem.id });
      setSelectedItems([{ type: "arrow", id: newItem.id }]);
    }

    if (tool === "line") {
  const newItem = {
    id: Date.now(),
    page,
    type: lineType,
    color: selectedColor,
   
    strokeWidth,
    lineDash,
    opacity: lineOpacity,
    zIndex: 80,

    p1: { x, y },

    p2:
      lineType === "lshape"
        ? { x: x + 220, y: y + 140 }
        : { x: x + 250, y },

    center:
      lineType === "curve"
        ? { x: x + 125, y: y - 90 }
        : lineType === "lshape"
        ? { x: x + 120, y: y + 140 }
        : null,
  };

  setLines((prev) => [...prev, newItem]);
  setSelectedObject({ type: "line", id: newItem.id });
  setSelectedItems([{ type: "line", id: newItem.id }]);
}

    if (tool === "measurement") {
      const newItem = {
        id: Date.now(),
        page,
        x,
        y,
        width: 260,
        height: 80,
        text: '22"',
        color: selectedColor,
        
        rotation: 0,
        measureType,
        zIndex: 90,
      };

      setMeasurements((prev) => [...prev, newItem]);
      setSelectedObject({ type: "measurement", id: newItem.id });
      setSelectedItems([{ type: "measurement", id: newItem.id }]);
    }

    if (tool === "box") {
      const newItem = {
        id: Date.now(),
        page,
        x,
        y,
        width: 180,
        height: 180,
        shapeType,
        fill: selectedColor,
        fillOpacity: 1,
        strokeColor: selectedColor,
        
        strokeWidth: 2,
        color: selectedColor,
        borderWidth: 2,
        zIndex: 50,
      };

      setBoxes((prev) => [...prev, newItem]);
      setSelectedObject({ type: "box", id: newItem.id });
      setSelectedItems([{ type: "box", id: newItem.id }]);
    }

    setTool("select");
  }

  function startDrawing(e) {
  if (tool !== "draw") return;
  
  setShowDrawSettings(false);

  const pdfContainer =
    pdfRef.current?.querySelector(".pdf-container");

  if (!pdfContainer) return;

  const rect = pdfContainer.getBoundingClientRect();

  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top) / zoom;

  const newDraw = {
  id: Date.now(),
  points: [{ x, y }],
  color: selectedColor,

  width: drawType === "eraser" ? eraserWeight : drawWeight,
  opacity: drawType === "eraser" ? 1 : drawOpacity,

  erase: drawType === "eraser",
};

  setDrawings((prev) => [...prev, newDraw]);

  setIsDrawing(true);
}

function moveDrawing(e) {
  if (tool !== "draw") {
    setDrawCursor(null);
    return;
  }

  const pdfContainer =
    pdfRef.current?.querySelector(".pdf-container");

  if (!pdfContainer) return;

  const rect = pdfContainer.getBoundingClientRect();

  const x = (e.clientX - rect.left) / zoom;
  const y = (e.clientY - rect.top) / zoom;

  const size =
    drawType === "eraser"
      ? eraserWeight
      : drawWeight;

  setDrawCursor({
    x,
    y,
    size,
    erase: drawType === "eraser",
    color: selectedColor,
    opacity:
      drawType === "eraser"
        ? 0.45
        : drawOpacity,
  });

  if (!isDrawing) return;

  setDrawings((prev) =>
    prev.map((d, index) =>
      index === prev.length - 1
        ? {
            ...d,
            points: [...d.points, { x, y }],
          }
        : d
    )
  );
}

function endDrawing() {
  setIsDrawing(false);
}

  function handleSelectionMouseDown(e) {
  if (tool === "draw") return;
  if (tool !== "select") return;
  if (e.target.closest(".rnd-object")) return;

  const container = pdfRef.current;
  if (!container) return;

  const rect = container.getBoundingClientRect();

  const x =
    (e.clientX - rect.left - 32 + container.scrollLeft) / zoom;

  const y =
    (e.clientY - rect.top - 32 + container.scrollTop) / zoom;

  selectionStartRef.current = { x, y };

  setIsSelecting(true);

  setSelectionBox({
    x,
    y,
    width: 0,
    height: 0,
  });
}

  function handleSelectionMouseMove(e) {
    if (!isSelecting) return;

    const container = pdfRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();

    const currentX =
      (e.clientX - rect.left - 32 + container.scrollLeft) / zoom;

    const currentY =
      (e.clientY - rect.top - 32 + container.scrollTop) / zoom;

    const start = selectionStartRef.current;
    if (!start) return;

    setSelectionBox({
      x: Math.min(start.x, currentX),
      y: Math.min(start.y, currentY),
      width: Math.abs(currentX - start.x),
      height: Math.abs(currentY - start.y),
    });
  }

  function handleSelectionMouseUp() {
    if (!selectionBox) {
      setIsSelecting(false);
      return;
    }

    const selected = [];

    getAllObjects().forEach((obj) => {
      const hit =
        obj.x < selectionBox.x + selectionBox.width &&
        obj.x + obj.width > selectionBox.x &&
        obj.y < selectionBox.y + selectionBox.height &&
        obj.y + obj.height > selectionBox.y;

      if (hit) {
        selected.push({
          type: obj.kind,
          id: obj.id,
        });
      }
    });

    setSelectedItems(selected);
    setSelectedObject(selected[0] || null);

    setSelectionBox(null);
    setIsSelecting(false);
  }

  function cleanUndefined(obj) {
  return JSON.parse(
    JSON.stringify(obj, (key, value) =>
      value === undefined ? null : value
    )
  );
}
    async function saveProject() {
    const id = urlProjectId || currentProjectId;

    const cleanImages = images.filter(
      (img) => !img.src?.startsWith("data:")
    );

    const localData = {
      id,
      pdf,
      texts: cleanUndefined(texts),
      images: cleanUndefined(cleanImages),
      arrows: cleanUndefined(arrows),
      lines: cleanUndefined(lines),
      measurements: cleanUndefined(measurements),
      boxes: cleanUndefined(boxes),
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(
      "techpackProject",
      JSON.stringify(localData)
    );

    if (!id) {
      setSaveStatus("Saved");
      alert("Project saved locally");
      return;
    }

    const snap = await getDoc(
      doc(db, "techpacks", id)
    );

    const oldData = snap.exists()
      ? snap.data()
      : null;

    await updateDoc(
      doc(db, "techpacks", id),
      {
        ...(oldData?.status === "Exported"
          ? {}
          : {
              pdfUrl: pdf?.startsWith("data:")
                ? oldData?.pdfUrl || ""
                : pdf,
            }),

        texts: cleanUndefined(texts),
        images: cleanUndefined(cleanImages),
        arrows: cleanUndefined(arrows),
        lines: cleanUndefined(lines),
        measurements: cleanUndefined(measurements),
        boxes: cleanUndefined(boxes),

        status:
          oldData?.status === "Exported"
            ? "Exported"
            : "Edited",

        updatedAt: serverTimestamp(),

        lastSavedAt:
          new Date().toISOString(),
      }
    );

    setSaveStatus("Saved");

    alert("Project saved");
  }

  useEffect(() => {
    const id =
      urlProjectId || currentProjectId;

    if (!id || !pdf || exportingRef.current)
      return;

    setSaveStatus("Unsaved changes");

    const timer = setTimeout(async () => {
      if (exportingRef.current) return;

      try {
        setSaveStatus("Saving...");

        const snap = await getDoc(
          doc(db, "techpacks", id)
        );

        const oldData = snap.exists()
          ? snap.data()
          : null;

        const cleanImages = images.filter(
          (img) =>
            !img.src?.startsWith("data:")
        );

        await updateDoc(
          doc(db, "techpacks", id),
          {
            ...(oldData?.status === "Exported"
              ? {}
              : {
                  pdfUrl:
                    pdf?.startsWith("data:")
                      ? oldData?.pdfUrl || ""
                      : pdf,
                }),

            texts,
            images: cleanImages,
            arrows,
            lines,
            measurements,
            boxes,

            status:
              oldData?.status ===
              "Exported"
                ? "Exported"
                : "Edited",

            updatedAt: serverTimestamp(),

            lastAutoSavedAt:
              new Date().toISOString(),
          }
        );

        localStorage.setItem(
          "techpackProject",
          JSON.stringify({
            id,
            pdf,
            texts,
            images,
            arrows,
            lines,
            measurements,
            boxes,
            updatedAt:
              new Date().toISOString(),
          })
        );

        setSaveStatus("Saved");
      } catch (err) {
        console.error(
          "Auto save failed:",
          err
        );

        setSaveStatus("Save failed");
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [
    pdf,
    texts,
    images,
    arrows,
    lines,
    measurements,
    boxes,
    currentProjectId,
    urlProjectId,
  ]);

  function loadProject() {
    const saved =
      localStorage.getItem(
        "techpackProject"
      );

    if (!saved) {
      alert("No saved project found");
      return;
    }

    const projectData = JSON.parse(saved);

    setPdf(projectData.pdf || "");
    setTexts(projectData.texts || []);
    setImages(projectData.images || []);
    setArrows(projectData.arrows || []);
    setLines(projectData.lines || []);
    setMeasurements(
      projectData.measurements || []
    );
    setBoxes(projectData.boxes || []);

    setSelectedItems([]);
    setSelectedObject(null);

    alert("Project loaded");
  }

  async function exportPDF() {
    const input =
      pdfRef.current?.querySelector(
        ".pdf-container"
      );

    if (!input) {
      alert("PDF container not found");
      return;
    }

    const oldTransform =
      input.style.transform;

    try {
      exportingRef.current = true;

      setSaveStatus("Exporting...");

      input.style.transform = "scale(1)";
      input.style.transformOrigin =
        "top left";

      await new Promise((resolve) =>
        setTimeout(resolve, 800)
      );

      const canvas =
        await html2canvas(input, {
          scale: 1,
          backgroundColor: "#ffffff",
          useCORS: true,
          allowTaint: false,
          logging: false,
        });

      const imgData =
        canvas.toDataURL(
          "image/jpeg",
          0.85
        );

      const pdfDoc = new jsPDF(
        "p",
        "mm",
        "a4",
        true
      );

      const pageWidth =
        pdfDoc.internal.pageSize.getWidth();

      const pageHeight =
        pdfDoc.internal.pageSize.getHeight();

      const imgWidth = pageWidth;

      const imgHeight =
        (canvas.height * imgWidth) /
        canvas.width;

      let heightLeft = imgHeight;
      let position = 0;

      pdfDoc.addImage(
        imgData,
        "JPEG",
        0,
        position,
        imgWidth,
        imgHeight
      );

      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;

        pdfDoc.addPage();

        pdfDoc.addImage(
          imgData,
          "JPEG",
          0,
          position,
          imgWidth,
          imgHeight
        );

        heightLeft -= pageHeight;
      }

      const exportedPdf = pdfDoc.output("datauristring");

      const id = urlProjectId || currentProjectId;

      if (id) {
        const projectRef = doc(db, "techpacks", id);
        const snap = await getDoc(projectRef);
        const oldData = snap.exists() ? snap.data() : {};

        await updateDoc(projectRef, {
          editedPdfUrl: oldData?.editedPdfUrl || oldData?.pdfUrl || "",
          pdfUrl: oldData?.pdfUrl || "",

          texts,
          images,
          arrows,
          lines,
          measurements,
          boxes,
          drawings,
          pages,

          status: "Exported",
          updatedAt: serverTimestamp(),
          lastSavedAt: new Date().toISOString(),

          versions: [
            ...(oldData.versions || []),
            {
              status: "Exported",
             
              texts,
              images,
              arrows,
              lines,
              measurements,
              boxes,
              drawings,
              pages,
              createdAt: new Date().toISOString(),
            },
          ],
        });
      }

      pdfDoc.save("techpack.pdf");

      setSaveStatus("Saved");

      alert("PDF Exported");
    } catch (err) {
      console.error(err);

      setSaveStatus("Export failed");

      alert("Export failed");
    } finally {
      exportingRef.current = false;

      input.style.transform =
        oldTransform;
    }
  }
    useEffect(() => {
    const handleKeyDown = (e) => {
      const key = e.key.toLowerCase();

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && key === "e") {
        e.preventDefault();
        exportPDF();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && key === "s") {
        e.preventDefault();
        saveProject();
        return;
      }

      const tag = e.target.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        e.target.isContentEditable;

      if (isTyping) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteSelected();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && key === "c") {
        e.preventDefault();
        copySelected();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && key === "v") {
        e.preventDefault();
        pasteClipboard();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && key === "d") {
        e.preventDefault();
        duplicateSelected();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && key === "z") {
        e.preventDefault();
        undo();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && key === "z") {
        e.preventDefault();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [
    selectedItems,
    clipboard,
    images,
    texts,
    lines,
    arrows,
    measurements,
    boxes,
    history,
    redoStack,
    currentProjectId,
    urlProjectId,
    pdf,
  ]);

  function bringToFront() {
    if (!selectedItems.length) return;

    saveHistory();

    const maxZ = Math.max(
      1,
      ...getAllObjects().map((i) => i.zIndex || 1)
    );

    selectedItems.forEach((selected, index) => {
      const newZ = maxZ + 100 + index;

      updateObjectByType(selected.type, (item) =>
        item.id === selected.id
          ? {
              ...item,
              zIndex: newZ,
            }
          : item
      );
    });
  }

  function sendToBack() {
    if (!selectedItems.length) return;

    saveHistory();

    const minZ = Math.min(
      ...getAllObjects().map((i) => i.zIndex || 1),
      1
    );

    selectedItems.forEach((selected, index) => {
      updateObjectByType(selected.type, (item) =>
        item.id === selected.id
          ? {
              ...item,
              zIndex: minZ - index - 1,
            }
          : item
      );
    });
  }
    function getObjectBounds(obj) {
  if (obj.kind === "line") {
    const points = [obj.p1, obj.p2, obj.center].filter(Boolean);

    const minX = Math.min(...points.map((p) => p.x));
    const maxX = Math.max(...points.map((p) => p.x));
    const minY = Math.min(...points.map((p) => p.y));
    const maxY = Math.max(...points.map((p) => p.y));

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  return {
    x: obj.x || 0,
    y: obj.y || 0,
    width: obj.width || 0,
    height: obj.height || 0,
  };
}

function align(mode) {
  if (!selectedItems.length) return;

  saveHistory();

  const selectedObjects = getAllObjects().filter((obj) =>
    selectedItems.some((s) => s.id === obj.id && s.type === obj.kind)
  );

  if (!selectedObjects.length) return;

  const bounds = selectedObjects.map((obj) => ({
    obj,
    box: getObjectBounds(obj),
  }));

  const leftX = Math.min(...bounds.map((i) => i.box.x));
  const rightX = Math.max(...bounds.map((i) => i.box.x + i.box.width));

  const centerX =
    bounds.reduce((sum, i) => sum + i.box.x + i.box.width / 2, 0) /
    bounds.length;

  function getNewX(box) {
    if (mode === "left") return leftX;
    if (mode === "right") return rightX - box.width;
    return centerX - box.width / 2;
  }

  const updateNormal = (items, type) =>
    items.map((item) => {
      const selected = selectedItems.some(
        (s) => s.type === type && s.id === item.id
      );

      if (!selected) return item;

      const box = getObjectBounds({ ...item, kind: type });
      const newX = getNewX(box);

      return {
        ...item,
        x: newX,
      };
    });

  setTexts((p) => updateNormal(p, "text"));
  setImages((p) => updateNormal(p, "image"));
  setArrows((p) => updateNormal(p, "arrow"));
  setMeasurements((p) => updateNormal(p, "measurement"));
  setBoxes((p) => updateNormal(p, "box"));

  setLines((prev) =>
    prev.map((line) => {
      const selected = selectedItems.some(
        (s) => s.type === "line" && s.id === line.id
      );

      if (!selected) return line;

      const box = getObjectBounds({ ...line, kind: "line" });
      const newX = getNewX(box);
      const dx = newX - box.x;

      return {
        ...line,
        p1: line.p1 ? { ...line.p1, x: line.p1.x + dx } : line.p1,
        p2: line.p2 ? { ...line.p2, x: line.p2.x + dx } : line.p2,
        center: line.center
          ? { ...line.center, x: line.center.x + dx }
          : line.center,
      };
    })
  );
}

  function distributeHorizontal() {
    if (selectedItems.length < 3) {
      return alert(
        "Select at least 3 items"
      );
    }

    const objects = getAllObjects()
      .filter((obj) =>
        selectedItems.some(
          (s) =>
            s.id === obj.id &&
            s.type === obj.kind
        )
      )
      .sort((a, b) => a.x - b.x);

    saveHistory();

    const first = objects[0];
    const last = objects[objects.length - 1];

    const firstCenter =
      first.x + first.width / 2;

    const lastCenter =
      last.x + last.width / 2;

    const gap =
      (lastCenter - firstCenter) /
      (objects.length - 1);

    const positions = {};

    objects.forEach((obj, index) => {
      const newCenter =
        firstCenter + gap * index;

      positions[
        `${obj.kind}-${obj.id}`
      ] = newCenter - obj.width / 2;
    });

    const update = (items, type) =>
      items.map((item) => {
        const key = `${type}-${item.id}`;

        return positions[key] === undefined
          ? item
          : {
              ...item,
              x: positions[key],
            };
      });

    setTexts((p) => update(p, "text"));
    setImages((p) => update(p, "image"));
    setArrows((p) => update(p, "arrow"));
    setLines((p) => update(p, "line"));
    setMeasurements((p) =>
      update(p, "measurement")
    );
    setBoxes((p) => update(p, "box"));
  }

  function distributeVertical() {
    if (selectedItems.length < 3) {
      return alert(
        "Select at least 3 items"
      );
    }

    const objects = getAllObjects()
      .filter((obj) =>
        selectedItems.some(
          (s) =>
            s.id === obj.id &&
            s.type === obj.kind
        )
      )
      .sort((a, b) => a.y - b.y);

    saveHistory();

    const first = objects[0];
    const last = objects[objects.length - 1];

    const firstCenter =
      first.y + first.height / 2;

    const lastCenter =
      last.y + last.height / 2;

    const gap =
      (lastCenter - firstCenter) /
      (objects.length - 1);

    const positions = {};

    objects.forEach((obj, index) => {
      const newCenter =
        firstCenter + gap * index;

      positions[
        `${obj.kind}-${obj.id}`
      ] = newCenter - obj.height / 2;
    });

    const update = (items, type) =>
      items.map((item) => {
        const key = `${type}-${item.id}`;

        return positions[key] === undefined
          ? item
          : {
              ...item,
              y: positions[key],
            };
      });

    setTexts((p) => update(p, "text"));
    setImages((p) => update(p, "image"));
    setArrows((p) => update(p, "arrow"));
    setLines((p) => update(p, "line"));
    setMeasurements((p) =>
      update(p, "measurement")
    );
    setBoxes((p) => update(p, "box"));
  }

   function toggleBoldSelectedText(e) {
  e.preventDefault();
  e.stopPropagation();

  document.execCommand("bold", false, null);

  setBoldText(document.queryCommandState("bold"));
}


  function changeSelectedColor(color) {
    setSelectedColor(color);

    if (!selectedItems.length) return;

    saveHistory();

    const recolor = (items, type) =>
      items.map((item) =>
        selectedItems.some(
          (s) =>
            s.type === type &&
            s.id === item.id
        )
          ? {
              ...item,
              color,
            }
          : item
      );

    setTexts((p) => recolor(p, "text"));
    setMeasurements((p) =>
      recolor(p, "measurement")
    );
    setArrows((p) => recolor(p, "arrow"));
    setLines((p) => recolor(p, "line"));
    setBoxes((p) => recolor(p, "box"));
  }

  function changeSelectedFontSize(nextSize) {
    const size = Math.max(
      6,
      Number(nextSize) || 18
    );

    setFontSize(size);

    if (!selectedItems.length) return;

    saveHistory();

    setTexts((prev) =>
      prev.map((item) =>
        selectedItems.some(
          (s) =>
            s.type === "text" &&
            s.id === item.id
        )
          ? {
              ...item,
              fontSize: size,
            }
          : item
      )
    );
  }


function setActiveTool(nextTool, panel = null) {
  setTool(nextTool);
  setActivePanel(panel);
}

function updateSelectedLineStyle(data) {
  if (!selectedItems.length) return;

  saveHistory();

  setLines((prev) =>
    prev.map((line) =>
      selectedItems.some((s) => s.type === "line" && s.id === line.id)
        ? { ...line, ...data }
        : line
    )
  );
}

function updateSelectedShape(data) {
  if (!selectedItems.length) return;

  saveHistory();

  setBoxes((prev) =>
    prev.map((box) =>
      selectedItems.some((s) => s.type === "box" && s.id === box.id)
        ? { ...box, ...data }
        : box
    )
  );
}

function getTextBoxHeight(text, width, fontSize) {
  if (typeof document === "undefined") return 45;

  const div = document.createElement("div");

  div.style.position = "absolute";
  div.style.visibility = "hidden";
  div.style.pointerEvents = "none";
  div.style.left = "-9999px";
  div.style.top = "-9999px";

  div.style.width = `${width}px`;
  div.style.fontSize = `${fontSize}px`;
  div.style.fontWeight = "600";
  div.style.lineHeight = "1.2";
  div.style.padding = "6px";
  div.style.boxSizing = "border-box";
  div.style.whiteSpace = "pre-wrap";
  div.style.wordBreak = "break-word";
  div.style.overflowWrap = "break-word";

  div.innerText = text || " ";

  document.body.appendChild(div);

  const height = div.scrollHeight;

  document.body.removeChild(div);

  return Math.max(45, height + 12);
}

function changeSelectedFontFamily(value) {
  setFontFamily(value);

  if (!selectedItems.length) return;

  saveHistory();

  setTexts((prev) =>
    prev.map((item) =>
      selectedItems.some(
        (s) => s.type === "text" && s.id === item.id
      )
        ? {
            ...item,
            fontFamily: value,
            height: getTextBoxHeight(
              item.text,
              item.width,
              item.fontSize || 18
            ),
          }
        : item
    )
  );
}

const DRAW_TOOLS = [
  { type: "pen", color: "#1683ff" },
  { type: "thickPen", color: "#ff1f1f" },
  { type: "marker", color: "#ffe600" },
  { type: "eraser", color: "#ff6b86" },
];

/* =========================
     PAGE FUNCTIONS
  ========================= */

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
    setPages(
      Array.from({ length: numPages }, (_, i) => ({
        id: Date.now() + i,
        type: "pdf",
        pdfPage: i + 1,
      }))
    );
  }

  function addBlankPage(index = pages.length - 1) {
  saveHistory();

  const newPage = {
    id: Date.now(),
    type: "blank",
  };

  const updated = [...pages];
  updated.splice(index + 1, 0, newPage);

  setPages(updated);
  setCurrentPage(index + 1);
}

  function duplicatePage(index) {
  saveHistory();

  const page = pages[index];

  const newPage = {
    ...page,
    id: Date.now(),
  };

  const updated = [...pages];
  updated.splice(index + 1, 0, newPage);

  setPages(updated);
  setCurrentPage(index + 1);
}

  function deletePage(index) {
  if (pages.length === 1) return;

  saveHistory();

  const updated = pages.filter((_, i) => i !== index);

  setPages(updated);
  setCurrentPage(Math.max(0, index - 1));
}

function updateLayerItem(type, id, data) {
  if (type === "text") setTexts((p) => p.map((x) => x.id === id ? { ...x, ...data } : x));
  if (type === "image") setImages((p) => p.map((x) => x.id === id ? { ...x, ...data } : x));
  if (type === "arrow") setArrows((p) => p.map((x) => x.id === id ? { ...x, ...data } : x));
  if (type === "line") setLines((p) => p.map((x) => x.id === id ? { ...x, ...data } : x));
  if (type === "measurement") setMeasurements((p) => p.map((x) => x.id === id ? { ...x, ...data } : x));
  if (type === "box") setBoxes((p) => p.map((x) => x.id === id ? { ...x, ...data } : x));
}

const currentPageObjects = getAllObjects().filter(
  (obj) => (obj.page ?? 0) === currentPage
);

  return (
      
    <div className="w-screen h-screen bg-[radial-gradient(circle_at_top,#1e1b4b_0%,#020617_55%)] flex flex-col overflow-hidden">
      {/* HIDDEN INPUTS */}

      <input
        hidden
        type="file"
        accept="application/pdf"
        ref={pdfInputRef}
        onChange={handlePdfUpload}
      />

      <input
        hidden
        multiple
        type="file"
        accept="image/*"
        ref={fileInputRef}
        onChange={handleImageUpload}
      />

      {/* =========================
          TOP BAR
      ========================= */}

      <header
        className="
          h-16
          shrink-0

          bg-[#07101f]/95
          backdrop-blur-xl

          border-b
          border-blue-500/30

          shadow-[0_0_35px_rgba(37,99,235,0.25)]

          flex
          items-center
          justify-between

          px-5
          z-50
        "
      >
        {/* LEFT */}

        <div className="flex items-center gap-3">
          <div
            className="
              w-10
              h-10
              rounded-xl

              bg-violet-600 hover:bg-violet-500
              shadow-[0_0_25px_rgba(124,58,237,0.45)]

              flex
              items-center
              justify-center

              text-white
              font-bold
              text-lg
            "
          >
            T
          </div>

          <div className="flex items-center gap-2">
            <button className={TOP_BUTTON}>
              File
            </button>

            <button className={TOP_BUTTON}>
              Edit
            </button>

            <button className={TOP_BUTTON}>
              View
            </button>

            <button className={TOP_BUTTON}>
              Resize
            </button>
          </div>
        </div>

        {/* CENTER */}

        <div
          className="
            flex items-center gap-2
            bg-[#081428]/95 backdrop-blur-xl
            px-4 py-2
            rounded-2xl
            border border-blue-400/60
            shadow-[0_0_25px_rgba(59,130,246,0.45)]
            text-blue-200
          "
        >
          <button
            onClick={undo}
            className={FLOAT_BUTTON}
          >
            <Undo2 size={18} />
          </button>

          <button
            onClick={redo}
            className={FLOAT_BUTTON}
          >
            <Redo2 size={18} />
          </button>

          <div className="w-px h-7 bg-slate-300 mx-1" />

          <button
            onClick={saveProject}
            className={FLOAT_BUTTON}
          >
            <Save size={18} />
          </button>

          <button
            onClick={exportPDF}
            className={FLOAT_BUTTON}
          >
            <Download size={18} />
          </button>

          <div className="w-px h-7 bg-slate-300 mx-1" />

          <span
            className="
              text-xs
              font-semibold
              text-slate-400
            "
          >
            {saveStatus}
          </span>
        </div>

        {/* RIGHT */}

        <div className="flex items-center gap-2">
          <button
            onClick={() =>
              pdfInputRef.current?.click()
            }
            className="
              h-10 px-4 rounded-xl
              bg-[#081428]/95
              border border-blue-400/50
              text-white font-semibold
              flex items-center gap-2
              shadow-[0_0_25px_rgba(59,130,246,0.35)]
              hover:bg-blue-600
            "
          >
            <Upload size={18} />
            Upload PDF
          </button>
        </div>
      </header>

      {/* =========================
          BODY
      ========================= */}

     <div
      onMouseDown={() => setShowColorPicker(false)}
      className="flex flex-1 overflow-hidden relative"
    >
              {/* =========================
            LEFT SIDEBAR
        ========================= */}

        <aside
          className="
            w-[84px]

            bg-[#0f172a]/95 backdrop-blur-xl

            border-r
            border-white/10

            flex
            flex-col
            items-center

            py-4
            gap-3

            shrink-0
          "
        >
          <SideItem
            label="Design"
            icon={<FileText size={22} />}
          />

          <SideItem
            label="Text"
            icon={<Type size={22} />}
            active={tool === "text"}
            onClick={() =>
              setActiveTool("text")
            }
          />

          <SideItem
            label="Uploads"
            icon={<Upload size={22} />}
            onClick={() =>
              fileInputRef.current?.click()
            }
          />

          <SideItem
            label="Shapes"
            icon={<Shapes size={22} />}
            active={activePanel === "shape" || tool === "box"}
            onClick={() => {
              setActivePanel(activePanel === "shape" ? null : "shape");
              setTool("select");
            }}
          />

          <SideItem
            label="Lines"
            icon={<Slash size={22} />}
            active={activePanel === "line" || tool === "line"}
            onClick={() => {
              setActivePanel(activePanel === "line" ? null : "line");
              setTool("select");
            }}
          />

          <SideItem
            label="Draw"
            icon={<PenLine size={22} />}
            active={activePanel === "pen" || tool === "draw"}
            onClick={() => {
              setActivePanel(activePanel === "pen" ? null : "pen");
              setTool("select");
            }}
          />

          <SideItem
            label="Measure"
            icon={<Move size={22} />}
            active={activePanel === "measure" || tool === "measurement"}
            onClick={() => {
              setActivePanel(activePanel === "measure" ? null : "measure");
              setTool("select");
            }}
          />

          <SideItem
            label="Layers"
            icon={<Layers size={22} />}
            onClick={() =>
              setShowLayers((v) => !v)
            }
          />
        </aside>

        {/* FLOATING TOOL PANEL */}

        <div
          className="
          absolute
          left-[95px]
          top-[90px]

          z-[999]

          flex
          flex-col
          gap-3
        "
        >

          {/* SELECT */}

          <button
            onClick={() =>
              setTool("select")
            }
            className={`
              ${TOOL_BUTTON}

              ${
                tool === "select"
                  ? "bg-violet-100 text-violet-700"
                  : "bg-[#111827]/90 backdrop-blur-xl"
              }
            `}
          >
            <MousePointer2 size={24} />
          </button>
          


         {/* SHAPE PANEL */}

{activePanel === "shape" && (
  <div
    className="
      fixed
      left-[96px]
      top-[180px]

      w-[74px]

      bg-[#111827]/90 backdrop-blur-xl
      rounded-[22px]

      shadow-xl
      border
      border-white/10

      p-2

      flex
      flex-col
      gap-2

      z-[99999]
    "
  >
    {[
      "square",
      "rounded",
      "circle",
      "triangleUp",
      "triangleDown",
      "diamond",
      "pentagon",
    ].map((type) => {

      const active =
        tool === "box" &&
        shapeType === type;

      return (  
      <button
        key={type}
        onClick={() => {
          setShapeType(type);
          setTool("box");
        }}
        className={`
          h-16 rounded-xl flex items-center justify-center transition
          ${
            active
              ? "bg-[#334366] shadow-[inset_0_0_0_1px_rgba(96,165,250,0.15)]"
              : "hover:bg-[#334366]/70"
          }
        `}
      >
        <ShapePreview type={type} />
      </button>
      );}
    )}
  </div>
)}

          {/* LINE PANEL */}
{activePanel === "line" && (
  <div
    className="
      fixed
      left-[96px]
      top-[300px]

      w-[80px]

      bg-[#111827]/90 backdrop-blur-xl
      border
      border-white/10

      rounded-[24px]

      shadow-xl

      p-2

      flex
      flex-col
      gap-2

      z-[99999]
    "
  >
    
    {/* STRAIGHT */}

    
    <button
      onClick={() => {
        setLineType("plain");
        setTool("line");
      }}
      className={`
        h-16 rounded-xl flex items-center justify-center transition
        ${
          tool === "line" && lineType === "plain"
            ? "bg-[#334366] shadow-[inset_0_0_0_1px_rgba(96,165,250,0.15)]"
            : "hover:bg-[#334366]/70"
        }
      `}
      >
      <svg width="44" height="44">
        <line
          x1="10"
          y1="22"
          x2="34"
          y2="22"
          stroke="#60a5fa"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <circle
          cx="10"
          cy="22"
          r="3.5"
          fill="white"
          stroke="#60a5fa"
          strokeWidth="2"
        />

        <circle
          cx="34"
          cy="22"
          r="3.5"
          fill="white"
          stroke="#60a5fa"
          strokeWidth="2"
        />
      </svg>
    </button>

    {/* CURVE */}
    <button
      onClick={() => {
        setLineType("curve");
        setTool("line");
      }}
      className={`
        h-16 rounded-xl flex items-center justify-center transition
        ${
          tool === "line" && lineType === "curve"
            ? "bg-[#334366] shadow-[inset_0_0_0_1px_rgba(96,165,250,0.15)]"
            : "hover:bg-[#334366]/70"
        }
      `}
    >
      <svg width="44" height="44">
        <path
          d="M10 30 Q22 8 34 18"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="3"
          strokeLinecap="round"
        />

        <circle
          cx="10"
          cy="30"
          r="3.5"
          fill="white"
          stroke="#60a5fa"
          strokeWidth="2"
        />

        <circle
          cx="34"
          cy="18"
          r="3.5"
          fill="white"
          stroke="#60a5fa"
          strokeWidth="2"
        />
      </svg>
    </button>

    {/* L SHAPE */}
    <button
      onClick={() => {
        setLineType("lshape");
        setTool("line");
      }}
      className={`
        h-16 rounded-xl flex items-center justify-center transition
        ${
          tool === "line" && lineType === "lshape"
           ? "bg-[#334366] shadow-[inset_0_0_0_1px_rgba(96,165,250,0.15)]"
           : "hover:bg-[#334366]/70"
        }
      `}
    >
      <svg width="44" height="44">
        <polyline
          points="10,10 10,32 32,32"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx="10"
          cy="10"
          r="3.5"
          fill="white"
          stroke="#60a5fa"
          strokeWidth="2"
        />

        <circle
          cx="32"
          cy="32"
          r="3.5"
          fill="white"
          stroke="#60a5fa"
          strokeWidth="2"
        />
      </svg>
    </button>
  </div>
)}

{activePanel === "measure" && (
  <div
    className="
      fixed left-[96px] top-[520px]
      w-[80px]
      bg-[#111827]/90 backdrop-blur-xl
      border border-white/10
      rounded-[24px]
      shadow-xl
      p-2 flex flex-col gap-2
      z-[99999]
    "
  >
    <button
      onClick={() => {
        setMeasureType("dots");
        setTool("measurement");
      }}
      className={`h-16 rounded-xl flex items-center justify-center transition ${
        measureType === "dots" ? "bg-[#334366]" : "hover:bg-[#334366]/70"
      }`}
    >
      <svg width="50" height="30">
        <line x1="10" y1="15" x2="40" y2="15" stroke="#8b5cf6" strokeWidth="4" />
        <circle cx="10" cy="15" r="6" fill="#8b5cf6" />
        <circle cx="40" cy="15" r="6" fill="#8b5cf6" />
      </svg>
    </button>

    <button
      onClick={() => {
        setMeasureType("bars");
        setTool("measurement");
      }}
      className={`h-16 rounded-xl flex items-center justify-center transition ${
        measureType === "bars" ? "bg-[#334366]" : "hover:bg-[#334366]/70"
      }`}
    >
      <svg width="56" height="34">
        <line x1="8" y1="17" x2="48" y2="17" stroke="#8b5cf6" strokeWidth="4" />
        <line x1="8" y1="8" x2="8" y2="26" stroke="#8b5cf6" strokeWidth="4" />
        <line x1="48" y1="8" x2="48" y2="26" stroke="#8b5cf6" strokeWidth="4" />
      </svg>
    </button>
  </div>
)}


{/* DRAW PANEL */}

{activePanel === "pen" && (
  <div
    className="
      fixed left-[96px] top-[200px]
      w-[80px]
      bg-[#111827]/90 backdrop-blur-xl border border-white/10
      rounded-[24px] shadow-xl
      p-2 flex flex-col gap-2 z-[99999]
    "
  >
    {DRAW_TOOLS.map((item) => {
      const active = tool === "draw" && drawType === item.type;

      return (
        <button
          key={item.type}
          onClick={() => {
            const alreadySelected = tool === "draw" && drawType === item.type;

            if (alreadySelected) {
              setTool("select");
              return;
            }

            setDrawType(item.type);
            if (!selectedColor) {
              setSelectedColor(item.color);
            }

            if (item.type === "pen") {
              setDrawWeight(3);
              setDrawOpacity(1);
            }

            if (item.type === "thickPen") {
              setDrawWeight(8);
              setDrawOpacity(1);
            }

            if (item.type === "marker") {
              setDrawWeight(16);
              setDrawOpacity(0.4);
            }

            if (item.type === "eraser") {
              setEraserWeight(24);
            }

          setTool("draw");
          }}

          className={`
            h-16 rounded-xl flex items-center justify-center transition

            ${
              active
                ? "bg-gradient-to-b from-violet-500 to-blue-600 text-white shadow-[0_0_25px_rgba(59,130,246,0.55)]"
                : "hover:bg-blue-500/15 hover:text-blue-300"
            }
          `}
        >
          <DrawPreview
            type={item.type}
            color={item.color}
            active={active}
          />
        </button>
      );
    })}

<button
  onClick={() =>
    setShowDrawSettings((prev) => !prev)
  }
  className="
    w-14
    h-14
    rounded-2xl

    bg-slate-100
    hover:bg-slate-200

    flex
    items-center
    justify-center
  "
>
  <div className="flex flex-col gap-1">
    <div className="w-6 h-1 rounded bg-slate-800" />
    <div className="w-6 h-1 rounded bg-slate-800" />
    <div className="w-6 h-1 rounded bg-slate-800" />
  </div>
</button>

  </div>
)}

{showDrawSettings && tool === "draw" && (
  <div
    className="
      fixed
      left-[210px]
      top-[420px]

      w-[250px]

      bg-[#111827]/90 backdrop-blur-xl/95
      border border-white/10
      rounded-[22px]
      shadow-xl
      p-3
      z-[99999]
    "
  >
    {/* PEN */}
    {drawType !== "eraser" && (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-semibold">
            Pen
          </div>

          <svg width="60" height="22">
            <path
              d="M5 15 C18 2, 35 22, 55 8"
              fill="none"
              stroke={selectedColor}
              strokeWidth={drawWeight}
              strokeLinecap="round"
              opacity={drawOpacity}
            />

            {tool === "draw" && drawCursor && (
  <div
    className="absolute rounded-full pointer-events-none z-[9998] border-2 border-white shadow-xl"
    style={{
      left: drawCursor.x,
      top: drawCursor.y,
      width: drawCursor.size,
      height: drawCursor.size,
      transform: "translate(-50%, -50%)",
      background: drawCursor.erase
        ? "rgba(255,255,255,0.75)"
        : drawCursor.color,
      opacity: drawCursor.erase ? 0.9 : drawCursor.opacity,
      outline: drawCursor.erase
        ? "2px solid rgba(148,163,184,0.8)"
        : "2px solid rgba(255,255,255,0.9)",
    }}
  />
)}

          </svg>
        </div>

        {/* COLOR PICKER */}

<div className="grid grid-cols-4 gap-3 mt-3">
  {[...DRAW_TOOLS.map((i) => i.color), ...customColors].map((color) => (
    <button
      key={color}
      onClick={() => setSelectedColor(color)}
      className="w-12 h-12 rounded-full border-4"
      style={{
        background: color,
        borderColor: selectedColor === color ? "white" : "transparent",
        boxShadow:
          selectedColor === color
            ? "0 0 18px rgba(255,255,255,0.8)"
            : "none",
      }}
    />
  ))}

  <button
    onClick={() => setShowColorPicker(true)}
    className="
      w-12 h-12 rounded-full bg-white text-black
      flex items-center justify-center text-3xl font-light
      border-4 border-white shadow-lg
    "
  >
    +
  </button>
</div>

        {/* WEIGHT */}
        <div className="mb-4">
          <div className="text-[11px] font-medium mb-1">
            Weight
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="1"
              max="40"
              value={drawWeight}
              onChange={(e) =>
                setDrawWeight(Number(e.target.value))
              }
              className="flex-1 accent-violet-600"
            />

            <input
              value={drawWeight}
              onChange={(e) =>
                setDrawWeight(Number(e.target.value))
              }
              className="
                w-11
                h-8

                rounded-xl
                border
                border-slate-300

                text-center
                text-xs
              "
            />
          </div>
        </div>

        {/* TRANSPARENCY */}
        <div>
          <div className="text-sm font-medium mb-2">
            Transparency
          </div>

          <div className="flex items-center gap-2">
            <input
              type="range"
              min="0.1"
              max="1"
              step="0.1"
              value={drawOpacity}
              onChange={(e) =>
                setDrawOpacity(Number(e.target.value))
              }
              className="flex-1 accent-violet-600"
            />

            <input
              value={Math.round(drawOpacity * 100)}
              onChange={(e) =>
                setDrawOpacity(
                  Math.min(
                    1,
                    Math.max(
                      0.1,
                      Number(e.target.value) / 100
                    )
                  )
                )
              }
              className="
                w-14
                h-10

                rounded-xl
                border
                border-slate-300

                text-center
                text-sm
              "
            />
          </div>
        </div>
      </>
    )}

    {/* ERASER */}
    {drawType === "eraser" && (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">
            Eraser
          </div>

          <svg width="42" height="18">
            <path
              d="M5 15 C18 2, 35 22, 55 8"
              fill="none"
              stroke="#9ca3af"
              strokeWidth={eraserWeight / 3}
              strokeLinecap="round"
            />

{tool === "draw" && drawCursor && (
  <div
    className="absolute rounded-full pointer-events-none z-[9998] border-2 border-white shadow-xl"
    style={{
      left: drawCursor.x,
      top: drawCursor.y,
      width: drawCursor.size,
      height: drawCursor.size,
      transform: "translate(-50%, -50%)",
      background: drawCursor.erase
        ? "rgba(255,255,255,0.75)"
        : drawCursor.color,
      opacity: drawCursor.erase ? 0.9 : drawCursor.opacity,
      outline: drawCursor.erase
        ? "2px solid rgba(148,163,184,0.8)"
        : "2px solid rgba(255,255,255,0.9)",
    }}
  />
)}

          </svg>
        </div>

        <div>
          <div className="text-sm font-medium mb-2">
            Weight
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="range"
              min="5"
              max="60"
              value={eraserWeight}
              onChange={(e) =>
                setEraserWeight(Number(e.target.value))
              }
              className="flex-1 accent-violet-600"
            />

            <input
              value={eraserWeight}
              onChange={(e) =>
                setEraserWeight(Number(e.target.value))
              }
              className="
                w-14
                h-10

                rounded-xl
                border
                border-slate-300

                text-center
                text-sm
              "
            />
          </div>
        </div>
      </>
    )}
  </div>
)}

{showColorPicker && (
  <div
    onMouseDown={(e) => e.stopPropagation()}
    onClick={(e) => e.stopPropagation()}
    className="
      fixed
      left-[210px]
      top-[150px]
      w-[300px]
      rounded-[28px]
      bg-[#0f172a]/95
      backdrop-blur-2xl
      border
      border-white/10
      shadow-[0_20px_80px_rgba(0,0,0,0.65)]
      p-4
      z-[999999]
    "
  >
    {/* BIG COLOR AREA */}
    <div
  className="relative w-full h-[125px] rounded-[16px] overflow-hidden mb-5 cursor-crosshair"
  onMouseDown={(e) => {
    const rect = e.currentTarget.getBoundingClientRect();

    const move = (ev) => {
      const x = Math.max(0, Math.min(100, ((ev.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((ev.clientY - rect.top) / rect.height) * 100));
      updatePickerColor(x, y);
    };

    move(e);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", () => {
      window.removeEventListener("mousemove", move);
    }, { once: true });
  }}
>
  <div
    className="absolute inset-0"
    style={{
      background: `linear-gradient(to right, white, hsl(${hue}, 100%, 50%))`,
    }}
  />

  <div
    className="absolute inset-0"
    style={{
      background: "linear-gradient(to top, #111827, transparent)",
    }}
  />

  <div
    className="
      absolute
      w-8 h-8 rounded-full
      border-[7px] border-white
      shadow-[0_8px_18px_rgba(0,0,0,0.55)]
      pointer-events-none
    "
    style={{
      left: `${pickerPos.x}%`,
      top: `${pickerPos.y}%`,
      transform: "translate(-50%, -50%)",
      background: selectedColor,
    }}
  />
</div>

    {/* HUE SLIDER */}
    <div className="relative w-full h-4 rounded-full overflow-visible mb-4">
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "linear-gradient(to right, red, yellow, lime, cyan, blue, magenta, red)",
        }}
      />

      <input
        type="range"
        min="0"
        max="360"
        value={hue}
        onChange={(e) => {
          const h = Number(e.target.value);
          setHue(h);
          updatePickerColor(pickerPos.x, pickerPos.y, h);
        }}
        className="absolute inset-0 opacity-0 cursor-pointer"
      />

      {/* WHITE ROUND */}
      <div
        className="
          absolute top-1/2
          w-7 h-7 rounded-full
          bg-white
          border-[5px] border-white
          shadow-[0_3px_10px_rgba(0,0,0,0.55)]
          pointer-events-none
        "
        style={{
          left: `${(hue / 360) * 100}%`,
          transform: "translate(-50%, -50%)",
          background: selectedColor,
        }}
      />
    </div>

    <div
  className="
    flex 
    items-center 
    gap-3

    w-full
    h-16

    rounded-3xl

    bg-white/5
    border border-white/10

    px-4
    overflow-hidden
  "
>
  {/* COLOR ROUND */}
  <div
    className="
      w-10
      h-10
      rounded-full
      shrink-0

      border-2
      border-white

      shadow-[0_2px_8px_rgba(0,0,0,0.25)]
    "
    style={{
      background: selectedColor,
    }}
  />

  {/* COLOR NAME */}
  <input
  value={selectedColor}
  onChange={(e) => {
    let value = e.target.value;

    if (!value.startsWith("#")) {
      value = "#" + value;
    }

    setSelectedColor(value);
  }}
  placeholder="#8B3482"
  className="
    flex-1
    min-w-0 
    bg-transparent
    text-white 
    text-lg
    font-semibold
    outline-none
  "
  />


      <button
        onClick={() => {
          setCustomColors((prev) =>
            prev.includes(selectedColor) ? prev : [...prev, selectedColor]
          );
          setShowColorPicker(false);
        }}
        className="
          shrink-0
          h-10
          min-w-[90px]
          px-4
          rounded-2xl
          bg-gradient-to-b
          from-violet-500
          to-purple-700
          text-white
          text-base
          font-bold
          shadow-[0_8px_20px_rgba(139,92,246,0.4)]
        "
      >
        Add
      </button>
    </div>
  </div>
)}
        </div>
        

        {/* =========================
            MAIN PDF AREA
        ========================= */}

        <main
          ref={pdfRef}
          onClick={handlePdfClick}
          onMouseDown={(e) => {
            handleSelectionMouseDown(e);
            startDrawing(e);
          }}

          onMouseMove={(e) => {
            handleSelectionMouseMove(e);
            moveDrawing(e);
          }}

          onMouseUp={() => {
            handleSelectionMouseUp();
            endDrawing();
          }}

          onMouseLeave={() => {
            setDrawCursor(null);
            endDrawing();
          }}

          className={`
            flex-1
            overflow-auto
            relative
            bg-[#e8edf5]

            ${tool === "draw" ? "cursor-none" : ""}

          `}
        >
                  {/* FLOAT TOOLBAR */}
          {selectedItems.length > 0 && (
            <div
  onMouseDown={(e) => e.stopPropagation()}
  onClick={(e) => e.stopPropagation()}
  className="
    floating-toolbar
    fixed
    top-20
    left-1/2
    -translate-x-1/2
    z-50
    bg-[#111827]/90 backdrop-blur-xl
    rounded-2xl
    shadow-xl
    border
    border-white/10
    px-3
    py-2
    flex
    items-center
    gap-1
    overflow-visible
  "
>
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => {
  const value = e.target.value;
  setSelectedColor(value);

  if (selectedObject?.type === "line") {
    updateSelectedLineStyle({ color: value });
  } else {
    changeSelectedColor(value);
  }
}}
                className="w-9 h-9 rounded-xl"
              />
              {selectedObject?.type === "line" && (
  <>
    {/* LINE DASH */}
<div className="relative">
  <button
    onClick={(e) => {
      e.stopPropagation();
      setLinePopup(linePopup === "dash" ? null : "dash");
    }}
    className="h-9 px-4 rounded-xl border bg-[#111827]/90 backdrop-blur-xl text-sm font-semibold"
  >
    {selectedFullObject?.lineDash || "Solid"}
  </button>

  {linePopup === "dash" && (
    <div
  className="
    absolute
    top-12
    left-1/2
    -translate-x-1/2

    bg-[#111827]/90 backdrop-blur-xl
    border
    border-white/10

    rounded-3xl
    shadow-xl

    px-0.5
    py-0.5

    flex
    items-center
    gap-1

    z-[99999]
  "
>
      {["solid", "dashed", "dotted"].map((type) => (
        <button
          key={type}
          onClick={() => {
            setLineDash(type);
            updateSelectedLineStyle({ lineDash: type });
            setLinePopup(null);
          }}
          className="
  w-24
  h-16

  rounded-2xl

  hover:bg-violet-100

  flex
  items-center
  justify-center
"
        >
          <svg width="60" height="24">
            <line
              x1="8"
              y1="12"
              x2="52"
              y2="12"
              stroke="#111"
              strokeWidth="4"
              strokeDasharray={
                type === "dashed" ? "10 8" : type === "dotted" ? "3 7" : "0"
              }
            />
          </svg>
        </button>
      ))}
    </div>
  )}
</div>

{/* START */}
<div className="relative">
  <button
    onClick={(e) => {
      e.stopPropagation();
      setLinePopup(linePopup === "start" ? null : "start");
    }}
    className="h-9 px-4 rounded-xl border bg-[#111827]/90 backdrop-blur-xl text-sm font-semibold"
  >
    Start
  </button>

  {linePopup === "start" && (
    <MarkerPopup
      value={selectedFullObject?.lineStart || "none"}
      onPick={(type) => {
        setLineStart(type);
        updateSelectedLineStyle({ lineStart: type });
        setLinePopup(null);
      }}
    />
  )}
</div>

{/* END */}
<div className="relative">
  <button
    onClick={(e) => {
      e.stopPropagation();
      setLinePopup(linePopup === "end" ? null : "end");
    }}
    className="h-9 px-4 rounded-xl border bg-[#111827]/90 backdrop-blur-xl text-sm font-semibold"
  >
    End
  </button>

  {linePopup === "end" && (
    <MarkerPopup
      end
      value={selectedFullObject?.lineEnd || "none"}
      onPick={(type) => {
        setLineEnd(type);
        updateSelectedLineStyle({ lineEnd: type });
        setLinePopup(null);
      }}
    />
  )}
</div>

    <input
      type="range"
      min="1"
      max="20"
      value={selectedFullObject?.strokeWidth || 5}
      onMouseDown={() => setLineEditing(true)}
      onMouseUp={() => setLineEditing(false)}
      onTouchStart={() => setLineEditing(true)}
      onTouchEnd={() => setLineEditing(false)}
      onChange={(e) =>
        updateSelectedLineStyle({ strokeWidth: Number(e.target.value) })
      }
      className="w-24"
    />

    <input
      type="range"
      min="0.1"
      max="1"
      step="0.1"
      value={selectedFullObject?.opacity ?? 1}
      onChange={(e) =>
        updateSelectedLineStyle({ opacity: Number(e.target.value) })
      }
      className="w-24"
    />

    <button
      onClick={() =>
        updateSelectedLineStyle({
          roundCap: !(selectedFullObject?.roundCap || false),
        })
      }
      className={FLOAT_BUTTON}
    >
      Round
    </button>
  </>
)}

{selectedObject?.type === "measurement" && (
  <>
    <input
      type="range"
      min="2"
      max="20"
      value={selectedFullObject?.strokeWidth || 5}
      onChange={(e) => {
        const value = Number(e.target.value);
        setMeasurements((prev) =>
          prev.map((m) =>
            m.id === selectedObject.id ? { ...m, strokeWidth: value } : m
          )
        );
      }}
      className="w-24 accent-violet-600"
    />

    <input
      type="range"
      min="0.1"
      max="1"
      step="0.1"
      value={selectedFullObject?.opacity ?? 1}
      onChange={(e) => {
        const value = Number(e.target.value);
        setMeasurements((prev) =>
          prev.map((m) =>
            m.id === selectedObject.id ? { ...m, opacity: value } : m
          )
        );
      }}
      className="w-24 accent-violet-600"
    />
  </>
)}

{selectedObject?.type === "box" && (
  <>
    {/* THICKNESS / BORDER */}
    <input
      type="range"
      min="0"
      max="20"
      value={selectedFullObject?.strokeWidth ?? 2}
      onChange={(e) =>
        updateSelectedShape({
          strokeWidth: Number(e.target.value),
          strokeColor:
            selectedFullObject?.strokeColor ||
            selectedFullObject?.fill ||
            selectedColor,
        })
      }
      className="w-24"
    />

    {/* FILL TRANSPARENCY */}
    <input
      type="range"
      min="0"
      max="1"
      step="0.05"
      value={selectedFullObject?.fillOpacity ?? 1}
      onChange={(e) =>
        updateSelectedShape({
          fillOpacity: Number(e.target.value),
        })
      }
      className="w-24"
    />
  </>
)}

              {/* TEXT FONT FAMILY */}

              {selectedObject?.type === "text" && (
  <div className="relative">
    <button
      onClick={(e) => {
        e.stopPropagation();
        setLinePopup(
          linePopup === "fonts"
            ? null
            : "fonts"
        );
      }}
      className="
        h-9
        px-4
        rounded-xl
        border
        bg-[#111827]/90 backdrop-blur-xl

        text-sm
        font-semibold

        flex
        items-center
        gap-2
      "
      style={{
        fontFamily,
      }}
    >
      {fontFamily}
      <ChevronDown size={14} />
    </button>

    {linePopup === "fonts" && (
      <div
        className="
          absolute
          top-12
          left-1/2
          -translate-x-1/2

          w-[260px]
          max-h-[320px]
          overflow-y-auto

          bg-[#111827]/90 backdrop-blur-xl
          border
          border-white/10

          rounded-3xl
          shadow-[0_0_80px_rgba(0,0,0,0.7)]

          p-2

          flex
          flex-col
          gap-1

          z-[99999]
        "
      >
        {FONT_OPTIONS.map((font) => (
          <button
            key={font}
            onClick={() => {
              setFontFamily(font);

              document.execCommand(
                "fontName",
                false,
                font
              );

              changeSelectedFontFamily(font);

              setLinePopup(null);
            }}
            className="
              w-full
              h-12

              rounded-2xl

              px-4

              text-left

              hover:bg-violet-100

              transition
            "
            style={{
              fontFamily: font,
              fontSize: "18px",
            }}
          >
            {font}
          </button>
        ))}
      </div>
    )}
  </div>
)}

              <button onClick={() => changeSelectedFontSize(fontSize - 1)} className={FLOAT_BUTTON}>
                <Minus size={16} />
              </button>

              <input
                value={fontSize}
                onChange={(e) => changeSelectedFontSize(e.target.value)}
                className="w-14 h-9 rounded-xl border text-center"
              />

              <button onClick={() => changeSelectedFontSize(fontSize + 1)} className={FLOAT_BUTTON}>
                <Plus size={16} />
              </button>

              <button
  onMouseDown={toggleBoldSelectedText}
  className={`
    w-10 h-10 rounded-xl flex items-center justify-center transition-all
    ${
      boldText
        ? "bg-gradient-to-b from-violet-500 to-blue-600 text-white shadow-[0_0_25px_rgba(59,130,246,0.55)]"
        : "text-blue-300 hover:bg-violet-500/20 hover:text-white"
    }
  `}
>
  <Bold size={17} />
</button>

              <button onClick={() => align("left")} className={FLOAT_BUTTON}>
                <AlignLeft size={17} />
              </button>

              <button onClick={() => align("center")} className={FLOAT_BUTTON}>
                <AlignCenter size={17} />
              </button>

              <button onClick={() => align("right")} className={FLOAT_BUTTON}>
                <AlignRight size={17} />
              </button>

              <button onClick={bringToFront} className={FLOAT_BUTTON}>
                <BringToFront size={17} />
              </button>

              <button onClick={sendToBack} className={FLOAT_BUTTON}>
                <SendToBack size={17} />
              </button>

              <button onClick={deleteSelected} className={`${FLOAT_BUTTON} text-red-500`}>
                <Trash2 size={17} />
              </button>
            </div>
          )}

          {/* PDF PAGE */}
<div className="min-h-full flex justify-center py-10">
  <div
    className={`
      relative
      pdf-container     
      min-w-[900px]

      ${tool === "draw" ? "select-none" : ""}
    `}
    style={{
      transform: `scale(${zoom})`,
      transformOrigin: "top center",
      userSelect: tool === "draw" ? "none" : "auto",
    }}
  >
    

    {selectionBox && (
      <div
        style={{
          left: selectionBox.x,
          top: selectionBox.y,
          width: selectionBox.width,
          height: selectionBox.height,
        }}
        className="
          absolute
          border-2
          border-cyan-400
          bg-cyan-400/10
          pointer-events-none
          z-[9999]
        "
      />
    )}

    {guides.map((guide, i) => (
      <div
        key={i}
        style={
          guide.type === "vertical"
            ? {
                left: guide.x,
                top: 0,
                width: 1,
                height: "100%",
              }
            : {
                top: guide.y,
                left: 0,
                height: 1,
                width: "100%",
              }
        }
        className="
          absolute
          bg-pink-500
          z-[9999]
          pointer-events-none
        "
      />
    ))}

    {pdf && (
  <Document file={pdf} onLoadSuccess={onDocumentLoadSuccess}>
    {pages.map((page, index) => (
      <div
        key={page.id}
        ref={(el) => (pageRefs.current[index] = el)}
        className="mb-10 relative"
      >
        {/* PAGE TOP BAR */}
        <div className="w-[900px] h-12 bg-[#edf1f7] flex justify-between px-3 items-center">
          <span className="font-bold text-slate-700">
            Page {index + 1}
          </span>
        </div>

        {/* PAGE BOX */}
        <div
          data-page-index={index}
          onClick={() => setCurrentPage(index)}
          className="page-box relative bg-white w-[900px] min-h-[1200px] shadow-xl overflow-hidden"
        >
          {page.type === "pdf" && (
            <Page
              pageNumber={page.pdfPage}
              width={900}
              renderTextLayer={tool !== "draw"}
              renderAnnotationLayer={tool !== "draw"}
            />
          )}

          {page.type === "blank" && (
            <div className="w-[900px] h-[1200px] bg-white" />
          )}

          {/* ✅ TEXTS */}
          {texts.filter((item) => (item.page ?? 0) === index).map((item) => (
            <RndObject
              key={item.id}
              item={item}
              type="text"
              selected={isSelected("text", item.id)}
              onSelect={toggleSelection}
              onDragStartCommon={onDragStartCommon}
              onDragStopCommon={onDragStopCommon}
              drawingMode={tool === "draw"}
              onResizeStop={(ref, position) => {
                setTexts((prev) =>
                  prev.map((t) =>
                    t.id === item.id
                      ? {
                          ...t,
                          width: parseInt(ref.style.width),
                          height: parseInt(ref.style.height),
                          x: position.x,
                          y: position.y,
                        }
                      : t
                  )
                );
              }}
              setTexts={setTexts}
            >
              <EditableTextBox item={item} selected={isSelected("text", item.id)} setTexts={setTexts} />
            </RndObject>
          ))}

          {/* ✅ IMAGES */}
          {images.filter((img) => (img.page ?? 0) === index).map((image) => (
            <RndObject
              key={image.id}
              item={image}
              type="image"
              selected={isSelected("image", image.id)}
              onSelect={toggleSelection}
              onDragStartCommon={onDragStartCommon}
              onDragStopCommon={onDragStopCommon}
              drawingMode={tool === "draw"}
              onResizeStop={(ref, position) => {
                setImages((prev) =>
                  prev.map((img) =>
                    img.id === image.id
                      ? {
                          ...img,
                          width: parseInt(ref.style.width),
                          height: parseInt(ref.style.height),
                          x: position.x,
                          y: position.y,
                        }
                      : img
                  )
                );
              }}
            >
              <img src={image.src} className="w-full h-full object-contain pointer-events-none" />
            </RndObject>
          ))}

          {/* ✅ BOXES */}
          {boxes.filter((box) => (box.page ?? 0) === index).map((box) => (
            <RndObject
              key={box.id}
              item={box}
              type="box"
              selected={isSelected("box", box.id)}
              onSelect={toggleSelection}
              onDragStartCommon={onDragStartCommon}
              onDragStopCommon={onDragStopCommon}
              drawingMode={tool === "draw"}
              onResizeStop={(ref, position) => {
                setBoxes((prev) =>
                  prev.map((b) =>
                    b.id === box.id
                      ? {
                          ...b,
                          width: parseInt(ref.style.width),
                          height: parseInt(ref.style.height),
                          x: position.x,
                          y: position.y,
                        }
                      : b
                  )
                );
              }}
            >
              <ShapeBox box={box} />
            </RndObject>
          ))}

          {/* ✅ MEASUREMENTS */}
{measurements
  .filter((m) => (m.page ?? 0) === index)
  .map((m) => (
    <RndObject
      key={m.id}
      item={m}
      type="measurement"
      selected={isSelected("measurement", m.id)}
      onSelect={toggleSelection}
      onDragStartCommon={onDragStartCommon}
      onDragStopCommon={onDragStopCommon}
      drawingMode={tool === "draw"}
      onResizeStop={() => {}}
    >
      <MeasurementSvg
        m={m}
        selected={isSelected("measurement", m.id)}
        setMeasurements={setMeasurements}
        zoom={zoom}
      />
    </RndObject>
  ))}

          {/* ✅ LINES */}
          {lines.filter((line) => (line.page ?? 0) === index).map((line) => (
            <EditableLine
              key={line.id}
              line={line}
              selected={isSelected("line", line.id)}
              onSelect={toggleSelection}
              setLines={setLines}
              pdfRef={pdfRef}
              zoom={zoom}
              linePopup={linePopup}
              lineEditing={lineEditing}
              drawingMode={tool === "draw"}
            />
          ))}
        </div>

        {/* ✅ LAYERS NEAR SAME PAGE */}
        {showLayers && currentPage === index && (
          <aside className="absolute left-[915px] top-[55px] w-[190px] max-h-[420px] overflow-y-auto bg-[#111827]/95 rounded-2xl p-2 z-[99999]">
            <div className="text-xs font-bold text-white mb-2">
              Layers - Page {index + 1}
            </div>

            {getAllObjects()
  .filter((obj) => (obj.page ?? 0) === index)
  .map((obj) => (
    <div
      key={`${obj.kind}-${obj.id}`}
      onClick={() => {
        setSelectedObject({ type: obj.kind, id: obj.id });
        setSelectedItems([{ type: obj.kind, id: obj.id }]);
      }}
      className="
        mb-2 bg-white rounded-xl p-2 text-xs
        flex items-center gap-2 cursor-pointer
        hover:ring-2 hover:ring-violet-500
      "
    >
      <LayerPreview obj={obj} />

      <span className="font-semibold text-slate-700">
        {getLayerName(obj)}
      </span>
    </div>
  ))}
          </aside>
        )}
      </div>
    ))}
  </Document>
)}

    {!pdf && (
      <div
        className="
          w-[900px]
          h-[1200px]

          flex
          flex-col
          items-center
          justify-center

          text-slate-400
          gap-4
        "
      >
        <Upload size={52} />

        <button
          onClick={() =>
            pdfInputRef.current?.click()
          }
          className="
            px-5
            py-3
            rounded-xl
            bg-violet-600 hover:bg-violet-500
            shadow-[0_0_25px_rgba(124,58,237,0.45)]
            font-bold
          "
        >
          Upload PDF
        </button>
      </div>
    )}

              

                          </div>
          </div>

          

          
{/* PAGE TRAY */}
{showPageTray && (
  <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[99999] bg-[#111827]/95 border border-white/10
  backdrop-blur-xl rounded-3xl shadow-[0_0_80px_rgba(0,0,0,0.7)] px-4 py-3 flex items-center gap-3 max-w-[70vw] overflow-x-auto">
    {pages.map((page, index) => (
      <button
        key={page.id}
        onClick={() => {
          setCurrentPage(index);
          pageRefs.current[index]?.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
        }}
        className={`
          w-20 h-24 shrink-0 rounded-2xl border overflow-hidden relative bg-[#111827]/90 backdrop-blur-xl
          ${
            currentPage === index
              ? "border-blue-500 ring-2 ring-blue-500 shadow-[0_0_25px_rgba(59,130,246,0.45)]"
              : "border-slate-200"
          }
        `}
      >
        <span className="absolute bottom-1 left-2 text-xs font-bold z-10">
          {index + 1}
        </span>

        {page.type === "pdf" ? (
          <div className="scale-[0.09] origin-top-left pointer-events-none">
            <Document file={pdf}>
              <Page
                pageNumber={page.pdfPage}
                width={900}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
          </div>
        ) : (
          <div className="w-full h-full bg-[#111827]/90 backdrop-blur-xl flex items-center justify-center text-xs text-slate-400">
            Blank
          </div>
        )}
      </button>
    ))}

    <button
      onClick={() => addBlankPage(currentPage)}
      className="w-20 h-24 shrink-0 rounded-2xl bg-slate-100 hover:bg-slate-200 text-3xl font-light"
    >
      +
    </button>

    <button
      onClick={() => duplicatePage(currentPage)}
      className="w-20 h-24 shrink-0 rounded-2xl bg-violet-100 hover:bg-violet-200 text-sm font-bold text-violet-700"
    >
      ⧉
    </button>

    <button
      onClick={() => deletePage(currentPage)}
      className="w-20 h-24 shrink-0 rounded-2xl bg-red-50 hover:bg-red-100 text-sm font-bold text-red-500"
    >
      🗑
    </button>
  </div>
)}

{/* SMALL BOTTOM RIGHT CONTROL BAR */}
<div
  className="
    fixed right-6 bottom-6 z-[99999]
    bg-[#07101f]/95
    backdrop-blur-xl
    border border-blue-400/50
    rounded-2xl
    shadow-[0_0_30px_rgba(59,130,246,0.45)]
    px-3 py-2
    flex items-center gap-2
    text-blue-200
  "
>
  <button
    onClick={() => setZoom((z) => Math.max(0.2, z - 0.1))}
    className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center"
  >
    <Minus size={15} />
  </button>

  <input
    type="range"
    min="0.2"
    max="2"
    step="0.1"
    value={zoom}
    onChange={(e) => setZoom(Number(e.target.value))}
    className="w-24"
  />

  <button
    onClick={() => setZoom((z) => Math.min(2, z + 0.1))}
    className="w-8 h-8 rounded-xl hover:bg-slate-100 flex items-center justify-center"
  >
    <Plus size={15} />
  </button>

  <span className="text-xs font-bold text-[#c4b5fd] hover:text-white w-10">
    {Math.round(zoom * 100)}%
  </span>

  <div className="w-px h-6 bg-slate-300 mx-1" />

  <button
    onClick={() => setShowPageTray((prev) => !prev)}
    className={`
      h-9 px-3 rounded-xl flex items-center gap-2 text-sm font-bold
      ${
        showPageTray
          ? "bg-gradient-to-b from-violet-500 to-blue-600 text-white shadow-[0_0_25px_rgba(59,130,246,0.6)]"
          : "bg-[#0f172a] text-[#c4b5fd] hover:bg-blue-600/20 hover:text-white border border-white/10"
      }
    `}
  >
    <Table size={18} />
    Pages
  </button>

  <span className="text-sm font-bold text-[#c4b5fd] hover:text-white">
    {currentPage + 1} / {pages.length}
  </span>
</div>

            
          
        </main>
      </div>
    </div>
  );
}

/* =========================
   COMPONENTS
========================= */

function SideItem({ label, icon, active = false, onClick }) {
  const iconColor = active ? "#ffffff" : "#c4b5fd";

  return (
    <button
      onClick={onClick}
      className="w-full flex flex-col items-center gap-1 text-[11px] font-semibold"
    >
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200"
        style={{
          background: active
            ? "linear-gradient(180deg, #8b5cf6 0%, #2563eb 100%)"
            : "transparent",
          boxShadow: active
            ? "0 0 25px rgba(59,130,246,0.55)"
            : "none",
        }}
      >
        {React.cloneElement(icon, {
          color: iconColor,
          stroke: iconColor,
          size: 22,
        })}
      </div>

      <span style={{ color: iconColor }}>
        {label}
      </span>
    </button>
  );
}

function RndObject({
  item,
  type,
  selected,
  onSelect,
  onDragStartCommon,
  onDragStopCommon,
  onResizeStop,
  setTexts,
  drawingMode,
  children,
}) {
  const canResize =
    selected &&
    (type === "box" || type === "image" || type === "text");

  return (
    <Rnd
      className="rnd-object"
      style={{
        zIndex: item.zIndex || 50,
        pointerEvents: drawingMode || item.hidden ? "none" : "auto",
        opacity: item.hidden ? 0 : item.opacity ?? 1,
      }}
      size={{ width: item.width, height: item.height }}
      position={{ x: item.x, y: item.y }}
      bounds="parent"
      enableResizing={canResize ? { bottomRight: true } : false}
      resizeHandleStyles={{
        bottomRight: {
          right: "8px",
          bottom: "8px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "#ffffff",
          border: "4px solid #8b5cf6",
          boxShadow: "0 6px 16px rgba(0,0,0,0.35)",
          zIndex: 999999,
        },
      }}
      cancel=".editable-text, input, textarea, button, select"
      onMouseDown={(e) => onSelect(type, item.id, e)}
      onDragStart={() => onDragStartCommon(item)}
      onDragStop={(e, d) => {
        onDragStopCommon(d, item, type);
      }}
      onResizeStop={(e, dir, ref, delta, position) => {
        onResizeStop(ref, position);
      }}
    >
      <div
        className="relative w-full h-full"
        style={{
          outline: selected ? "2px solid #8b5cf6" : "none",
          outlineOffset: "-2px",
          boxSizing: "border-box",
        }}
      >
        {children}
      </div>
    </Rnd>
  );
}

function MeasurementSvg({ m, selected, setMeasurements, zoom }) {
  const color = m.color || "#8b5cf6";
  const isBars = m.measureType === "bars";
  const stroke = m.strokeWidth || 5;
  const opacity = m.opacity ?? 1;

  const updateText = (value) => {
    setMeasurements((prev) =>
      prev.map((item) =>
        item.id === m.id ? { ...item, text: value } : item
      )
    );
  };

  const rotateResize = (side, e) => {
  e.preventDefault();
  e.stopPropagation();

  const pageBox = e.currentTarget.closest(".page-box");
  if (!pageBox) return;

  const centerX = m.x + m.width / 2;
  const centerY = m.y + m.height / 2;

  const move = (ev) => {
    const rect = pageBox.getBoundingClientRect();

    const mouseX = (ev.clientX - rect.left) / zoom;
    const mouseY = (ev.clientY - rect.top) / zoom;

    const dx = mouseX - centerX;
    const dy = mouseY - centerY;

    let angle = Math.atan2(dy, dx) * (180 / Math.PI);

    if (side === "left") angle += 180;

    const newWidth = Math.max(80, Math.sqrt(dx * dx + dy * dy) * 2);

    setMeasurements((prev) =>
      prev.map((item) =>
        item.id === m.id
          ? {
              ...item,
              rotation: angle,
              width: newWidth,
              x: centerX - newWidth / 2,
              y: centerY - item.height / 2,
            }
          : item
      )
    );
  };

  const up = () => {
    window.removeEventListener("mousemove", move);
    window.removeEventListener("mouseup", up);
  };

  window.addEventListener("mousemove", move);
  window.addEventListener("mouseup", up);
};

  return (
    <div
      className="w-full h-full relative flex items-center justify-center"
      style={{
        opacity: m.hidden ? 0 : opacity,
        transform: `rotate(${m.rotation || 0}deg)`,
        transformOrigin: "center",
      }}
    >
      <svg
        width="100%"
        height="100%"
        className="absolute inset-0 overflow-visible"
      >
        <line
          x1="18"
          y1={m.height / 2}
          x2={m.width - 18}
          y2={m.height / 2}
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
        />

        {isBars ? (
          <>
            <line
              x1="18"
              y1={m.height / 2 - 20}
              x2="18"
              y2={m.height / 2 + 20}
              stroke={color}
              strokeWidth={stroke + 1}
              strokeLinecap="round"
            />

            <line
              x1={m.width - 18}
              y1={m.height / 2 - 20}
              x2={m.width - 18}
              y2={m.height / 2 + 20}
              stroke={color}
              strokeWidth={stroke + 1}
              strokeLinecap="round"
            />
          </>
        ) : (
          <>
            <circle
              cx="18"
              cy={m.height / 2}
              r={stroke + 7}
              fill={color}
            />

            <circle
              cx={m.width - 18}
              cy={m.height / 2}
              r={stroke + 7}
              fill={color}
            />
          </>
        )}
      </svg>

      <input
        value={m.text}
        onChange={(e) => updateText(e.target.value)}
        className="
          absolute
          left-1/2
          top-[0px]
          w-24
          bg-transparent
          text-center
          font-bold
          outline-none
          pointer-events-auto
        "
        style={{
          color,
          fontSize: 24,
          transform: `translateX(-50%) rotate(${-(m.rotation || 0)}deg)`,
          transformOrigin: "center",
        }}
      />

      {selected && (
        <>
          <button
            onMouseDown={(e) => rotateResize("left", e)}
            className="
              absolute
              w-4 h-4
              rounded-full
              bg-white
              border-[3px]
              border-slate-300
              shadow-lg
              cursor-grab
            "
            style={{
              left: "18px",
              top: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />

          <button
            onMouseDown={(e) => rotateResize("right", e)}
            className="
              absolute
              w-4 h-4
              rounded-full
              bg-white
              border-[3px]
              border-slate-300
              shadow-lg
              cursor-grab
            "
            style={{
              right: "18px",
              top: "50%",
              transform: "translate(50%, -50%)",
            }}
          />
        </>
      )}
    </div>
  );
}

function ArrowSvg({ arrow }) {
  return (
    <svg
      width="100%"
      height="100%"
      style={{
        transform: `rotate(${arrow.rotation}deg)`,
        overflow: "visible",
      }}
    >
      <defs>
        <marker
          id={`arrow-${arrow.id}`}
          markerWidth="12"
          markerHeight="12"
          refX="7"
          refY="5"
          orient="auto"
        >
          <polygon
            points="0 1, 8 5, 0 9"
            fill={arrow.color}
          />
        </marker>
      </defs>

      {/* NORMAL */}

      {arrow.type === "normal" && (
        <line
          x1="20"
          y1={arrow.height / 2}
          x2={arrow.width - 20}
          y2={arrow.height / 2}
          stroke={arrow.color}
          strokeWidth="5"
          markerEnd={`url(#arrow-${arrow.id})`}
        />
      )}

      {/* DOUBLE */}

      {arrow.type === "double" && (
        <line
          x1="20"
          y1={arrow.height / 2}
          x2={arrow.width - 20}
          y2={arrow.height / 2}
          stroke={arrow.color}
          strokeWidth="5"
          markerStart={`url(#arrow-${arrow.id})`}
          markerEnd={`url(#arrow-${arrow.id})`}
        />
      )}

      {/* CURVE */}

      {arrow.type === "curve" && (
        <path
          d={`
            M 20 ${arrow.height - 20}
            Q ${arrow.width / 2} -30,
            ${arrow.width - 20} ${arrow.height / 2}
          `}
          fill="none"
          stroke={arrow.color}
          strokeWidth="5"
          markerEnd={`url(#arrow-${arrow.id})`}
        />
      )}

      {/* L SHAPE */}

      {arrow.type === "lshape" && (
        <polyline
          points={`
            20,20
            20,${arrow.height - 20}
            ${arrow.width - 20},${arrow.height - 20}
          `}
          fill="none"
          stroke={arrow.color}
          strokeWidth="5"
          markerEnd={`url(#arrow-${arrow.id})`}
        />
      )}
    </svg>
  );
}

function LineSvg({ line }) {
  const strokeWidth = line.strokeWidth || 5;
  const opacity = line.opacity ?? 1;
  const strokeLinecap = line.roundCap ? "round" : "butt";

  const dash =
    line.dash === "dashed"
      ? "14 10"
      : line.dash === "dotted"
      ? "2 10"
      : line.type === "dashed"
      ? "14 10"
      : line.type === "dots"
      ? "2 10"
      : "0";

  const markerStart =
    line.lineStart && line.lineStart !== "none"
      ? `url(#start-${line.id})`
      : undefined;

  const markerEnd =
    line.lineEnd && line.lineEnd !== "none"
      ? `url(#end-${line.id})`
      : undefined;

  return (
    <svg
      width="100%"
      height="100%"
      style={{
        transform: `rotate(${line.rotation || 0}deg)`,
        overflow: "visible",
        opacity,
      }}
    >
      <defs>
        <marker id={`start-${line.id}`} markerWidth="12" markerHeight="12" refX="5" refY="5" orient="auto">
          {line.lineStart === "arrow" && <polygon points="10 1, 2 5, 10 9" fill={line.color} />}
          {line.lineStart === "circle" && <circle cx="5" cy="5" r="4" fill={line.color} />}
          {line.lineStart === "square" && <rect x="2" y="2" width="7" height="7" fill={line.color} />}
        </marker>

        <marker id={`end-${line.id}`} markerWidth="12" markerHeight="12" refX="7" refY="5" orient="auto">
          {line.lineEnd === "arrow" && <polygon points="0 1, 8 5, 0 9" fill={line.color} />}
          {line.lineEnd === "circle" && <circle cx="5" cy="5" r="4" fill={line.color} />}
          {line.lineEnd === "square" && <rect x="2" y="2" width="7" height="7" fill={line.color} />}
        </marker>
      </defs>

      {line.type === "curve" ? (
        <path
          d={`M 10 ${line.height - 15} Q ${line.width / 2} 0 ${line.width - 10} ${line.height - 15}`}
          fill="none"
          stroke={line.color}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          strokeLinecap={strokeLinecap}
          markerStart={markerStart}
          markerEnd={markerEnd}
        />
      ) : line.type === "lshape" ? (
        <polyline
          points={`15,10 15,${line.height - 10} ${line.width - 10},${line.height - 10}`}
          fill="none"
          stroke={line.color}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          strokeLinecap={strokeLinecap}
          markerStart={markerStart}
          markerEnd={markerEnd}
        />
      ) : (
        <line
          x1="10"
          y1={line.height / 2}
          x2={line.width - 10}
          y2={line.height / 2}
          stroke={line.color}
          strokeWidth={strokeWidth}
          strokeDasharray={dash}
          strokeLinecap={strokeLinecap}
          markerStart={markerStart}
          markerEnd={markerEnd}
        />
      )}

      {line.type === "measure" && (
        <>
          <line x1="10" y1="10" x2="10" y2={line.height - 10} stroke={line.color} strokeWidth={strokeWidth} />
          <line x1={line.width - 10} y1="10" x2={line.width - 10} y2={line.height - 10} stroke={line.color} strokeWidth={strokeWidth} />
        </>
      )}
    </svg>
  );
}

function EditableLine({
  line,
  selected,
  onSelect,
  setLines,
  pdfRef,
  zoom,
  linePopup,
  lineEditing,
  drawingMode,
}) {
  function update(data) {
    setLines((prev) =>
      prev.map((l) =>
        l.id === line.id
          ? {
              ...l,
              ...data,
            }
          : l
      )
    );
  }

  const safe = (v, fallback) =>
    Number.isFinite(Number(v))
      ? Number(v)
      : fallback;

  const p1 = {
    x: safe(line.p1?.x, 100),
    y: safe(line.p1?.y, 100),
  };

  const p2 = {
    x: safe(line.p2?.x, 350),
    y: safe(line.p2?.y, 100),
  };

  const control =
  line.type === "curve"
    ? {
        x: safe(line.center?.x, (p1.x + p2.x) / 2),
        y: safe(line.center?.y, (p1.y + p2.y) / 2 - 80),
      }
    : line.type === "lshape"
    ? {
        x: safe(line.center?.x, (p1.x + p2.x) / 2),
        y: safe(line.center?.y, (p1.y + p2.y) / 2),
      }
    : null;

const curveHandle =
  line.type === "curve" && control
    ? {
        x: 0.25 * p1.x + 0.5 * control.x + 0.25 * p2.x,
        y: 0.25 * p1.y + 0.5 * control.y + 0.25 * p2.y,
      }
    : null;

const lHandle =
  line.type === "lshape" && control
    ? {
        x: control.x,
        y: p2.y,
      }
    : null;

  function getPoint(e) {
    const page = e.target.closest(".page-box");

    if (!page) {
      return { x: 0, y: 0 };
    }

    const rect = page.getBoundingClientRect();

    return {
      x: (e.clientX - rect.left) / zoom,
      y: (e.clientY - rect.top) / zoom,
    };
  }

  function dragPoint(pointName, e) {
    e.preventDefault();
    e.stopPropagation();

    const move = (ev) => {
      const p = getPoint(ev);

      if (pointName === "p1") {
        update({
          p1: p,
        });
      }

      if (pointName === "p2") {
        update({
          p2: p,
        });
      }

      if (pointName === "center" && control) {
  if (line.type === "curve") {
    const newControl = {
      x: 2 * p.x - 0.5 * p1.x - 0.5 * p2.x,
      y: 2 * p.y - 0.5 * p1.y - 0.5 * p2.y,
    };

    update({ center: newControl });
  }

  if (line.type === "lshape") {
    update({
      center: {
        x: p.x,
        y: p2.y,
      },
    });
  }
}
    };

    const up = () => {
      window.removeEventListener(
        "mousemove",
        move
      );

      window.removeEventListener(
        "mouseup",
        up
      );
    };

    window.addEventListener(
      "mousemove",
      move
    );

    window.addEventListener(
      "mouseup",
      up
    );
  }

  function dragFullLine(e) {
    e.preventDefault();
    e.stopPropagation();

    const start = getPoint(e);

    const oldP1 = { ...p1 };
    const oldP2 = { ...p2 };

    const oldControl = control
      ? { ...control }
      : null;

    const move = (ev) => {
      const now = getPoint(ev);

      const dx = now.x - start.x;
      const dy = now.y - start.y;

      update({
        p1: {
          x: oldP1.x + dx,
          y: oldP1.y + dy,
        },

        p2: {
          x: oldP2.x + dx,
          y: oldP2.y + dy,
        },

        ...(oldControl
          ? {
              center: {
                x:
                  oldControl.x + dx,
                y:
                  oldControl.y + dy,
              },
            }
          : {}),
      });
    };

    const up = () => {
      window.removeEventListener(
        "mousemove",
        move
      );

      window.removeEventListener(
        "mouseup",
        up
      );
    };

    window.addEventListener(
      "mousemove",
      move
    );

    window.addEventListener(
      "mouseup",
      up
    );
  }

  let path = "";

  if (line.type === "curve") {
    path = `
      M ${p1.x} ${p1.y}
      Q ${control.x} ${control.y}
      ${p2.x} ${p2.y}
    `;
  } else if (
    line.type === "lshape"
  ) {
    path = `
      M ${p1.x} ${p1.y}
      L ${control.x} ${p1.y}
      L ${control.x} ${p2.y}
      L ${p2.x} ${p2.y}
    `;
  } else {
    path = `
      M ${p1.x} ${p1.y}
      L ${p2.x} ${p2.y}
    `;
  }

  const dash =
    line.lineDash === "dashed"
      ? "16 10"
      : line.lineDash === "dotted"
      ? "3 10"
      : "0";

  const markerStart =
  line.lineStart && line.lineStart !== "none"
    ? `url(#line-start-${line.id})`
    : undefined;

const markerEnd =
  line.lineEnd && line.lineEnd !== "none"
    ? `url(#line-end-${line.id})`
    : undefined;

  return (
    <svg
      className="
        absolute
        inset-0
        overflow-visible
        z-[80]
      "
      style={{
        pointerEvents: "none",
      }}
    >

      <LineMarkers line={line} />

      <path
        d={path}
        fill="none"
        stroke={line.color || "#111"}
        strokeWidth={line.strokeWidth || 5}
        strokeLinecap={line.roundCap ? "round" : "butt"}
        strokeLinejoin="round"
        strokeDasharray={
          line.lineDash === "dashed"
            ? "16 12"
            : line.lineDash === "dotted"
            ? "4 12"
            : "0"
        }
        markerStart={markerStart}
        markerEnd={markerEnd}
        opacity={line.hidden ? 0 : line.opacity ?? 1}
        style={{
  pointerEvents: drawingMode ? "none" : "stroke",
  cursor: drawingMode ? "none" : "move",
}}
        onMouseDown={dragFullLine}
        onClick={(e) => onSelect("line", line.id, e)}
      />

      {selected && !linePopup && !lineEditing && (
  <>
    <Handle x={p1.x} y={p1.y} onMouseDown={(e) => dragPoint("p1", e)} />
    <Handle x={p2.x} y={p2.y} onMouseDown={(e) => dragPoint("p2", e)} />

    {line.type === "curve" && curveHandle && (
      <Handle
        x={curveHandle.x}
        y={curveHandle.y}
        onMouseDown={(e) => dragPoint("center", e)}
      />
    )}

    {line.type === "lshape" && lHandle && (
      <Handle
        x={lHandle.x}
        y={lHandle.y}
        onMouseDown={(e) => dragPoint("center", e)}
      />
    )}
  </>
)}
    </svg>
  );
}

function LineMarkers({ line }) {
  const color = line.color || "#111";

  function MarkerShape({ type, end = false }) {
    if (type === "arrow") {
      return (
        <polygon
          points={end ? "0 0, 10 5, 0 10" : "10 0, 0 5, 10 10"}
          fill="none"
          stroke={color}
          strokeWidth="2"
        />
      );
    }

    if (type === "arrowFilled") {
      return (
        <polygon
          points={end ? "0 0, 10 5, 0 10" : "10 0, 0 5, 10 10"}
          fill={color}
        />
      );
    }

    if (type === "circle") {
      return <circle cx="5" cy="5" r="4" fill="white" stroke={color} strokeWidth="2" />;
    }

    if (type === "circleFilled") {
      return <circle cx="5" cy="5" r="4" fill={color} />;
    }

    if (type === "square") {
      return <rect x="1" y="1" width="8" height="8" fill="white" stroke={color} strokeWidth="2" />;
    }

    if (type === "squareFilled") {
      return <rect x="1" y="1" width="8" height="8" fill={color} />;
    }

    if (type === "diamond") {
      return <polygon points="5 0, 10 5, 5 10, 0 5" fill="white" stroke={color} strokeWidth="2" />;
    }

    if (type === "diamondFilled") {
      return <polygon points="5 0, 10 5, 5 10, 0 5" fill={color} />;
    }

    if (type === "bar") {
      return <line x1="5" y1="0" x2="5" y2="10" stroke={color} strokeWidth="2.5" />;
    }

    return null;
  }

  return (
    <defs>
      <marker
        id={`line-start-${line.id}`}
        markerWidth="12"
        markerHeight="12"
        refX="5"
        refY="5"
        orient="auto"
      >
        <MarkerShape type={line.lineStart} />
      </marker>

      <marker
        id={`line-end-${line.id}`}
        markerWidth="12"
        markerHeight="12"
        refX="5"
        refY="5"
        orient="auto"
      >
        <MarkerShape type={line.lineEnd} end />
      </marker>
    </defs>
  );
}

function Handle({ x, y, onMouseDown }) {
  return (
    <circle
      cx={x}
      cy={y}
      r="14"
      fill="white"
      stroke="#cbd5e1"
      strokeWidth="4"
      style={{ pointerEvents: "all", cursor: "grab" }}
      onMouseDown={onMouseDown}
    />
  );
}

function MarkerPopup({ value, onPick, end = false }) {
  const markers = [
    "none",
    "arrow",
    "circle",
    "square",
    "diamond",
    "bar",
    "arrowFilled",
    "circleFilled",
    "squareFilled",
    "diamondFilled",
  ];

  return (
    <div
      className="
        absolute
        top-12
        left-1/2
        -translate-x-1/2

        w-[320px]

        bg-[#111827]/90 backdrop-blur-xl
        border
        border-white/10
        rounded-3xl
        shadow-[0_0_80px_rgba(0,0,0,0.7)]

        p-2

        grid
        grid-cols-5
        gap-1

        z-[99999]
      "
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {markers.map((type) => (
        <button
          key={type}
          onClick={() => onPick(type)}
          className={`
            w-12
            h-12
            rounded-xl
            flex
            items-center
            justify-center

            ${value === type ? "bg-violet-100" : "hover:bg-slate-100"}
          `}
        >
          <MarkerPreview type={type} end={end} />
        </button>
      ))}
    </div>
  );
}

function MarkerPreview({ type, end = false }) {
  return (
    <svg width="40" height="20">
      <line
        x1={end ? 5 : 15}
        y1="10"
        x2={end ? 25 : 35}
        y2="10"
        stroke="#111"
        strokeWidth="2.5"
      />

      {type === "arrow" && (
        <polygon
          points={
            end
              ? "25,10 18,6 18,14"
              : "15,10 22,6 22,14"
          }
          fill="none"
          stroke="#111"
          strokeWidth="2"
        />
      )}

      {type === "arrowFilled" && (
        <polygon
          points={
            end
              ? "25,10 18,6 18,14"
              : "15,10 22,6 22,14"
          }
          fill="#111"
        />
      )}

      {type === "circle" && (
        <circle
          cx={end ? 25 : 15}
          cy="10"
          r="4"
          fill="white"
          stroke="#111"
          strokeWidth="2"
        />
      )}

      {type === "circleFilled" && (
        <circle
          cx={end ? 25 : 15}
          cy="10"
          r="4"
          fill="#111"
        />
      )}

      {type === "square" && (
        <rect
          x={end ? 21 : 11}
          y="6"
          width="8"
          height="8"
          fill="white"
          stroke="#111"
          strokeWidth="2"
        />
      )}

      {type === "squareFilled" && (
        <rect
          x={end ? 21 : 11}
          y="6"
          width="8"
          height="8"
          fill="#111"
        />
      )}

      {type === "diamond" && (
        <polygon
          points={
            end
              ? "25,10 21,6 17,10 21,14"
              : "15,10 19,6 23,10 19,14"
          }
          fill="white"
          stroke="#111"
          strokeWidth="2"
        />
      )}

      {type === "diamondFilled" && (
        <polygon
          points={
            end
              ? "25,10 21,6 17,10 21,14"
              : "15,10 19,6 23,10 19,14"
          }
          fill="#111"
        />
      )}

      {type === "bar" && (
        <line
          x1={end ? 25 : 15}
          y1="4"
          x2={end ? 25 : 15}
          y2="16"
          stroke="#111"
          strokeWidth="2"
        />
      )}

      {type === "none" && (
        <circle
          cx={end ? 25 : 15}
          cy="10"
          r="7"
          fill="none"
          stroke="#111"
          strokeWidth="2"
        />
      )}
    </svg>
  );
}

function LineHandle({ point, onMouseDown }) {
  if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) return null;

  return (
    <button
      onMouseDown={onMouseDown}
      className="absolute w-6 h-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#111827]/90 backdrop-blur-xl border-2 border-slate-300 shadow pointer-events-auto"
      style={{
        left: `${point.x}px`,
        top: `${point.y}px`,
      }}
    />
  );
}

function ShapePreview({ type }) {
  return (
    <ShapeBox
      box={{
        shapeType: type,
        fill: "#111827",
        strokeColor: "#111827",
        strokeWidth: 0,
        fillOpacity: 1,
      }}
      preview
    />
  );
}

function ShapeBox({ box, preview = false }) {
  const fill = box.fill || box.color || "#111827";
  const strokeColor = box.strokeColor || box.color || fill;
  const strokeWidth = preview ? 0 : box.strokeWidth ?? 2;
  const fillOpacity = preview ? 1 : box.hidden ? 0 : box.fillOpacity ?? box.opacity ?? 1;

  const svgStyle = {
    width: preview ? 30 : "100%",
    height: preview ? 30 : "100%",
    overflow: "hidden",
    display: "block",
  };

  const props = {
    fill,
    fillOpacity,
    stroke: strokeColor,
    strokeWidth,
    vectorEffect: "non-scaling-stroke",
  };

  if (box.shapeType === "square") {
    return (
      <svg viewBox="0 0 100 100" style={svgStyle}>
        <rect x="0" y="0" width="100" height="100" {...props} />
      </svg>
    );
  }

  if (box.shapeType === "rounded") {
    return (
      <svg viewBox="0 0 100 100" style={svgStyle}>
        <rect x="0" y="0" width="100" height="100" rx="18" {...props} />
      </svg>
    );
  }

  if (box.shapeType === "circle") {
    return (
      <svg viewBox="0 0 100 100" style={svgStyle}>
        <circle cx="50" cy="50" r="50" {...props} />
      </svg>
    );
  }

  if (box.shapeType === "triangleUp") {
    return (
      <svg viewBox="0 0 100 100" style={svgStyle}>
        <polygon points="50,4 96,96 4,96" {...props} />
      </svg>
    );
  }

  if (box.shapeType === "triangleDown") {
    return (
      <svg viewBox="0 0 100 100" style={svgStyle}>
        <polygon points="4,4 96,4 50,96" {...props} />
      </svg>
    );
  }

  if (box.shapeType === "diamond") {
    return (
      <svg viewBox="0 0 100 100" style={svgStyle}>
        <polygon points="50,4 96,50 50,96 4,50" {...props} />
      </svg>
    );
  }

  if (box.shapeType === "pentagon") {
    return (
      <svg viewBox="0 0 100 100" style={svgStyle}>
        <polygon points="50,4 96,38 82,96 18,96 4,38" {...props} />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 100 100" style={svgStyle}>
      <rect x="2" y="2" width="96" height="96" {...props} />
    </svg>
  );
}

function EditableTextBox({ item, selected, setTexts }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;

    ref.current.innerHTML = item.html || item.text || "Add Text";
  }, [item.id]);

  return (
    <div
  ref={ref}
  contentEditable
  suppressContentEditableWarning
  className="editable-text"
  onMouseDown={(e) => {
    if (!selected) e.stopPropagation();
    }}
  onInput={(e) => {
    const el = e.currentTarget;
    const neededHeight = Math.ceil(el.scrollHeight);
    setTexts((prev) =>
      prev.map((t) => {
        if (t.id !== item.id) return t;
        const oldHeight = t.height || 45;
        return {
          ...t,
          text: el.innerText,
          html: el.innerHTML,
          height: neededHeight > oldHeight + 6 ? neededHeight : oldHeight,
        };
      })
    );
  }}
  style={{
    width: "100%",
    height: "100%",
    minHeight: "100%",
    color: item.color || "#8b5cf6",
    fontSize: item.fontSize || 24,
    fontFamily: item.fontFamily || "Arial",
    lineHeight: "1.2",
    padding: "4px",
    boxSizing: "border-box",
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    overflow: "hidden",
    outline: "none",
    background: "transparent",
    
  }}
/>
  );
}

function DrawPreview({ type, color, active }) {
  const scale = active ? 1.15 : 1;

  if (type === "eraser") {
    return (
      <div
        style={{ transform: `scale(${scale})` }}
        className="w-12 h-8 rounded-md bg-pink-400 border-r-4 border-pink-200"
      />
    );
  }

  const isPen = type === "pen";
  const isMarker = type === "marker";
  const isThick = type === "thickPen";

  return (
    <svg
      width="50"
      height="50"
      viewBox="0 0 50 50"
      style={{ transform: `scale(${scale})` }}
    >
      <rect
        x="16"
        y="6"
        width="18"
        height={isMarker ? 24 : 20}
        rx="2"
        fill={color}
        stroke="white"
        strokeWidth="2"
      />

      <path
        d={
          isPen
            ? "M17 26 L33 26 L28 39 L22 39 Z"
            : isMarker
            ? "M16 30 L34 30 L31 38 L19 38 Z"
            : "M16 26 L34 26 L30 38 L20 38 Z"
        }
        fill="#020617"
        stroke="white"
        strokeWidth="2"
      />

      <path
        d={
          isPen
            ? "M23 39 L27 39 L25 49 Z"
            : isMarker
            ? "M20 38 L30 38 L27 44 L23 44 Z"
            : "M21 38 L29 38 L27 46 L23 46 Z"
        }
        fill={color}
        stroke="white"
        strokeWidth="2"
      />

      {isMarker && (
        <path
          d="M31 38 L39 34 L39 40 L27 44 Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
        />
      )}

      {isThick && (
        <rect
          x="22"
          y="42"
          width="6"
          height="5"
          rx="2"
          fill={color}
        />
      )}
    </svg>
  );
}

function getLayerName(obj) {
  if (obj.kind === "text") return `Text: ${obj.text || "Add Text"}`;

  if (obj.kind === "image") return "Uploaded Image";

  if (obj.kind === "box") {
    return `${obj.shapeType || "Shape"} Shape`;
  }

  if (obj.kind === "line") {
    return `${obj.type || "Line"} Line`;
  }

  if (obj.kind === "measurement") {
    return `Measurement ${obj.text || ""}`;
  }

  if (obj.kind === "arrow") {
    return `${obj.type || "Arrow"} Arrow`;
  }

  return obj.kind;
}

function LayerPreview({ obj }) {
  if (obj.kind === "box") {
    return (
      <div className="w-8 h-8 shrink-0">
        <ShapeBox box={obj} preview />
      </div>
    );
  }

  if (obj.kind === "image") {
    return (
      <img
        src={obj.src}
        className="w-8 h-8 rounded object-cover shrink-0"
      />
    );
  }

  if (obj.kind === "measurement") {
    return (
      <div className="w-8 h-8 shrink-0 flex items-center justify-center text-violet-600 font-bold">
        ↔
      </div>
    );
  }

  if (obj.kind === "line") {
    return (
      <div className="w-8 h-8 shrink-0 flex items-center justify-center">
        <svg width="28" height="18">
          <line
            x1="3"
            y1="9"
            x2="25"
            y2="9"
            stroke={obj.color || "#8b5cf6"}
            strokeWidth="3"
          />
        </svg>
      </div>
    );
  }

  if (obj.kind === "text") {
    return (
      <div className="w-8 h-8 shrink-0 flex items-center justify-center font-bold text-violet-600">
        T
      </div>
    );
  }

  return <div className="w-8 h-8 shrink-0 rounded bg-slate-200" />;
}