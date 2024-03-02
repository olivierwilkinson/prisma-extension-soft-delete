import { Prisma } from "@prisma/client";

export type ModelConfig = {
  field: string;
  createValue: (deleted: boolean) => any;
  allowToOneUpdates?: boolean;
  allowCompoundUniqueIndexWhere?: boolean;
};

export type Config = {
  models: Partial<Record<Prisma.ModelName, ModelConfig | boolean>>;
  defaultConfig?: ModelConfig;
};