export interface ErdField {
  readonly name: string;
  readonly type: string;
  readonly optional: boolean;
  readonly key: '' | 'PK' | 'UK';
}

export interface ErdRelation {
  readonly target: string;
  readonly optional: boolean;
  readonly fields: readonly string[];
}

export interface ErdModel {
  readonly name: string;
  readonly fields: ErdField[];
  readonly relations: ErdRelation[];
}
