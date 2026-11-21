// react-types.d.ts — déclarations TypeScript minimales et STRICTES pour React.
// Pourquoi ce fichier : React 18 n'embarque pas ses propres types et aucune dépendance
// @types/react n'est installée (règle « aucune nouvelle dépendance »). Ce shim déclare
// UNIQUEMENT ce que src/ utilise (hooks, Component, éléments JSX intrinsèques), sans
// aucun `any` explicite. Il est global (pris en compte via tsconfig "include": ["src"]) :
// aucun import nécessaire dans les fichiers consommateurs.
// Remarque : si @types/react est ajouté un jour, supprimer ce fichier.

declare module 'react' {
  export type Key = string | number;

  export interface ReactElement {
    type: unknown;
    props: unknown;
    key: Key | null;
  }

  export type ReactNode =
    | ReactElement
    | string
    | number
    | boolean
    | null
    | undefined
    | readonly ReactNode[];

  /** Style inline : propriétés CSS en camelCase (valeurs string | number). */
  export interface CSSProperties {
    [property: string]: string | number | undefined;
  }

  export interface RefObject<T> {
    readonly current: T | null;
  }
  export interface MutableRefObject<T> {
    current: T;
  }
  export type Ref<T> = RefObject<T> | MutableRefObject<T>;

  /** Événement synthétique minimal (cible typée via le paramètre de classe). */
  export interface SyntheticEvent<T = Element> {
    preventDefault(): void;
    stopPropagation(): void;
    target: EventTarget & T;
    currentTarget: EventTarget & T;
  }
  export type MouseEvent<T = Element> = SyntheticEvent<T>;
  export type KeyboardEvent<T = Element> = SyntheticEvent<T> & {
    key: string;
    shiftKey: boolean;
  };
  export type ChangeEvent<T = Element> = SyntheticEvent<T>;

  /** Classe de base des composants "class" (ErrorBoundary). */
  export class Component<P = {}, S = {}> {
    constructor(props: P);
    readonly props: P;
    state: S;
    render(): ReactNode;
  }

  export function useState<S>(
    initial: S | (() => S)
  ): [S, (value: S | ((prev: S) => S)) => void];
  export function useRef<T>(initial: T): MutableRefObject<T>;
  export function useRef<T>(initial: T | null): RefObject<T>;
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  export function useCallback<T extends (...args: never[]) => unknown>(
    fn: T,
    deps: readonly unknown[]
  ): T;
  export function useSyncExternalStore<Snapshot>(
    subscribe: (onStoreChange: () => void) => () => void,
    getSnapshot: () => Snapshot
  ): Snapshot;
}

// Props des éléments intrinsèques utilisés par l'appli (HTML + SVG), typés sans `any`.
declare namespace ReactShim {
  interface HTMLProps<T extends HTMLElement> {
    key?: import('react').Key | null;
    children?: import('react').ReactNode;
    className?: string;
    style?: import('react').CSSProperties;
    id?: string;
    title?: string;
    role?: string;
    hidden?: boolean;
    disabled?: boolean;
    type?: string;
    accept?: string;
    value?: string;
    maxLength?: number;
    rows?: number;
    placeholder?: string;
    src?: string;
    alt?: string;
    ref?: import('react').Ref<T>;
    onClick?: (event: import('react').MouseEvent<T>) => void;
    onKeyDown?: (event: import('react').KeyboardEvent<T>) => void;
    onChange?: (event: import('react').ChangeEvent<T>) => void;
    'aria-hidden'?: string | boolean;
    'aria-modal'?: string | boolean;
    'aria-label'?: string;
  }

  interface SVGProps {
    key?: import('react').Key | null;
    children?: import('react').ReactNode;
    className?: string;
    viewBox?: string;
    width?: string | number;
    height?: string | number;
    fill?: string;
    stroke?: string;
    strokeWidth?: string | number;
    strokeLinecap?: string;
    strokeLinejoin?: string;
    fillRule?: string;
    points?: string;
    d?: string;
    cx?: string | number;
    cy?: string | number;
    r?: string | number;
    rx?: string | number;
    ry?: string | number;
    x?: string | number;
    y?: string | number;
    x1?: string | number;
    y1?: string | number;
    x2?: string | number;
    y2?: string | number;
    transform?: string;
    'aria-hidden'?: string | boolean;
  }
}

declare module 'react/jsx-runtime' {
  export const Fragment: symbol;
  export function jsx(
    type: unknown,
    props: unknown,
    key?: import('react').Key
  ): import('react').ReactElement;
  export function jsxs(
    type: unknown,
    props: unknown,
    key?: import('react').Key
  ): import('react').ReactElement;

  export namespace JSX {
    type Element = import('react').ReactElement;
    type Key = import('react').Key;
    interface IntrinsicAttributes {
      key?: Key | null;
    }
    interface ElementChildrenAttribute {
      children: unknown;
    }
    interface IntrinsicElements {
      a: ReactShim.HTMLProps<HTMLAnchorElement>;
      button: ReactShim.HTMLProps<HTMLButtonElement>;
      div: ReactShim.HTMLProps<HTMLDivElement>;
      h1: ReactShim.HTMLProps<HTMLHeadingElement>;
      h2: ReactShim.HTMLProps<HTMLHeadingElement>;
      h3: ReactShim.HTMLProps<HTMLHeadingElement>;
      i: ReactShim.HTMLProps<HTMLElement>;
      img: ReactShim.HTMLProps<HTMLImageElement>;
      input: ReactShim.HTMLProps<HTMLInputElement>;
      li: ReactShim.HTMLProps<HTMLLIElement>;
      p: ReactShim.HTMLProps<HTMLParagraphElement>;
      small: ReactShim.HTMLProps<HTMLElement>;
      span: ReactShim.HTMLProps<HTMLSpanElement>;
      strong: ReactShim.HTMLProps<HTMLElement>;
      textarea: ReactShim.HTMLProps<HTMLTextAreaElement>;
      ul: ReactShim.HTMLProps<HTMLUListElement>;
      svg: ReactShim.SVGProps;
      g: ReactShim.SVGProps;
      path: ReactShim.SVGProps;
      circle: ReactShim.SVGProps;
      line: ReactShim.SVGProps;
      rect: ReactShim.SVGProps;
      ellipse: ReactShim.SVGProps;
      polyline: ReactShim.SVGProps;
      polygon: ReactShim.SVGProps;
    }
  }
}
