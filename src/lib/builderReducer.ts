import type { BuilderState, BuilderAction } from "@/types";
import { getCatalogItem, getContainerDef } from "@/data/catalog";

function computePrice(state: BuilderState): number {
  if (!state.container) return 0;
  const container = getContainerDef(state.container);
  const containerPrice = container?.price ?? 0;
  const substratePrice = state.substrate ? 3.99 : 0;
  const itemsPrice = state.placedItems.reduce((acc, placed) => {
    const item = getCatalogItem(placed.itemId);
    return acc + (item?.price ?? 0);
  }, 0);
  return Math.round((containerPrice + substratePrice + itemsPrice) * 100) / 100;
}

export function builderReducer(
  state: BuilderState,
  action: BuilderAction
): BuilderState {
  let next: BuilderState;

  switch (action.type) {
    case "SET_CONTAINER":
      next = { ...state, container: action.shape };
      break;

    case "SET_SUBSTRATE":
      next = { ...state, substrate: action.substrate };
      break;

    case "SELECT_ITEM":
      next = { ...state, selectedItemId: action.itemId, toolMode: action.itemId ? "place" : state.toolMode };
      break;

    case "PLACE_ITEM":
      next = { ...state, placedItems: [...state.placedItems, action.item] };
      break;

    case "REMOVE_ITEM":
      next = {
        ...state,
        placedItems: state.placedItems.filter((p) => p.id !== action.id),
        selectedPlacedId: state.selectedPlacedId === action.id ? null : state.selectedPlacedId,
      };
      break;

    case "SET_TOOL":
      next = { ...state, toolMode: action.mode, selectedPlacedId: null };
      break;

    case "SELECT_PLACED":
      next = { ...state, selectedPlacedId: action.id };
      break;

    case "UPDATE_ITEM_ROTATION":
      next = {
        ...state,
        placedItems: state.placedItems.map((p) =>
          p.id === action.id ? { ...p, rotationY: action.rotationY } : p
        ),
      };
      return next; // price unchanged, skip recompute

    case "UNDO":
      next = {
        ...state,
        placedItems: state.placedItems.slice(0, -1),
      };
      break;

    case "NEXT_STEP":
      next = { ...state, step: Math.min(3, state.step + 1) as 1 | 2 | 3 };
      break;

    case "PREV_STEP":
      next = { ...state, step: Math.max(1, state.step - 1) as 1 | 2 | 3 };
      break;

    default:
      return state;
  }

  return { ...next, totalPrice: computePrice(next) };
}

export const initialState: BuilderState = {
  step: 1,
  container: null,
  substrate: null,
  placedItems: [],
  selectedItemId: null,
  selectedPlacedId: null,
  toolMode: "place",
  totalPrice: 0,
};
