// store/admin/admin.types.ts

export interface Subject {
  id: string;
  name: string;
  examTypeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSubjectDto {
  id: string;
  name: string;
  examTypeId: string;
  orderIndex?: number;
}

export type UpdateSubjectDto = Partial<CreateSubjectDto>;
