export type LotNode = {
  id: string;
  label: string;
  meta: string;
};

export type BarrioNode = {
  id: string;
  name: string;
  lotCount: number;
  vacant: number;
  complexId?: string | null;
  complexName?: string | null;
  lots: LotNode[];
};

export type ComplexNode = {
  id: string;
  name: string;
  barrioCount: number;
  lotCount: number;
  barrios: BarrioNode[];
};
