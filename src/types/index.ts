export type ContainerShape = "jar" | "tank";
export type SubstrateType = "sand" | "soil";
export type ToolMode = "place" | "remove" | "sculpt" | "foam" | "smooth";
export type WizardStep = 1 | 2 | 3;

export interface CatalogItem {
  id: string;
  name: string;
  category: "plant" | "decoration";
  price: number;
  modelUrl: string;
  scale: number;
  yOffset: number;
  clusterCount?: number; // how many to place in a cluster
  color: string; // fallback color dot
  iconUrl?: string; // botanical illustration shown in the sidebar list
}

export interface PlacedItem {
  id: string; // unique instance id
  itemId: string; // catalog id
  position: [number, number, number];
  /** World-space surface normal at the placement point — used to tilt the item with the slope */
  normal: [number, number, number];
  rotationY: number;
  scale: number;
}

export interface ContainerDef {
  shape: ContainerShape;
  name: string;
  description: string;
  price: number;
  radius: number; // inner radius for item placement bounds
}

export interface BuilderState {
  step: WizardStep;
  container: ContainerShape | null;
  substrate: SubstrateType | null;
  placedItems: PlacedItem[];
  selectedItemId: string | null;
  /** ID of the placed instance currently selected for rotation */
  selectedPlacedId: string | null;
  toolMode: ToolMode;
  totalPrice: number;
}

export type BuilderAction =
  | { type: "SET_CONTAINER"; shape: ContainerShape }
  | { type: "SET_SUBSTRATE"; substrate: SubstrateType }
  | { type: "SELECT_ITEM"; itemId: string | null }
  | { type: "PLACE_ITEM"; item: PlacedItem }
  | { type: "REMOVE_ITEM"; id: string }
  | { type: "SET_TOOL"; mode: ToolMode }
  | { type: "SELECT_PLACED"; id: string | null }
  | { type: "UPDATE_ITEM_ROTATION"; id: string; rotationY: number }
  | { type: "UNDO" }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" };
