interface PrunTile {
  id: string;
  container: HTMLElement;
  frame: HTMLDivElement;
  anchor: HTMLDivElement;
  window: HTMLElement | null;
  docked: boolean;
  fullCommand: string;
  command: string;
  parameter: string | undefined;
}

// Build time (MM-DD HH:mm, China time), set by vite.config.mts.
declare const __BUILD_TIME__: string;
