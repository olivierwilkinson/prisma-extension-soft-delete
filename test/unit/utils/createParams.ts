import { Prisma } from "@prisma/client";

type DelegateByModel<Model extends Prisma.ModelName> = Model extends "User"
  ? Prisma.UserDelegate<any>
  : Model extends "Post"
  ? Prisma.PostDelegate<any>
  : Model extends "Profile"
  ? Prisma.ProfileDelegate<any>
  : Model extends "Comment"
  ? Prisma.CommentDelegate<any>
  : never;

type SelectByModel<Model extends Prisma.ModelName> = Model extends "User"
  ? Prisma.UserSelect
  : Model extends "Post"
  ? Prisma.PostSelect
  : Model extends "Profile"
  ? Prisma.ProfileSelect
  : Model extends "Comment"
  ? Prisma.CommentSelect
  : never;

type IncludeByModel<Model extends Prisma.ModelName> = Model extends "User"
  ? Prisma.UserInclude
  : Model extends "Post"
  ? Prisma.PostInclude
  : Model extends "Profile"
  ? Prisma.ProfileInclude
  : Model extends "Comment"
  ? Prisma.CommentInclude
  : never;

type ActionByModel<Model extends Prisma.ModelName> =
  | keyof DelegateByModel<Model>
  | "connectOrCreate"
  | "select"
  | "include";

type ArgsByAction<
  Model extends Prisma.ModelName,
  Action extends ActionByModel<Model>
> = Action extends "create"
  ? Parameters<DelegateByModel<Model>["create"]>[0]
  : Action extends "update"
  ? Parameters<DelegateByModel<Model>["update"]>[0]
  : Action extends "upsert"
  ? Parameters<DelegateByModel<Model>["upsert"]>[0]
  : Action extends "delete"
  ? Parameters<DelegateByModel<Model>["delete"]>[0]
  : Action extends "deleteMany"
  ? Parameters<DelegateByModel<Model>["deleteMany"]>[0]
  : Action extends "updateMany"
  ? Parameters<DelegateByModel<Model>["updateMany"]>[0]
  : Action extends "findUnique"
  ? Parameters<DelegateByModel<Model>["findUnique"]>[0]
  : Action extends "findUniqueOrThrow"
  ? Parameters<DelegateByModel<Model>["findUnique"]>[0]
  : Action extends "groupBy"
  ? Parameters<DelegateByModel<Model>["groupBy"]>[0]
  : Action extends "findFirst"
  ? Parameters<DelegateByModel<Model>["findFirst"]>[0]
  : Action extends "findFirstOrThrow"
  ? Parameters<DelegateByModel<Model>["findFirstOrThrow"]>[0]
  : Action extends "findMany"
  ? Parameters<DelegateByModel<Model>["findMany"]>[0]
  : Action extends "count"
  ? Parameters<DelegateByModel<Model>["count"]>[0]
  : Action extends "aggregate"
  ? Parameters<DelegateByModel<Model>["aggregate"]>[0]
  : Action extends "connectOrCreate"
  ? {
      where: Parameters<DelegateByModel<Model>["findUnique"]>[0];
      create: Parameters<DelegateByModel<Model>["create"]>[0];
    }
  : Action extends "select"
  ? SelectByModel<Model>
  : Action extends "include"
  ? IncludeByModel<Model>
  : never;

/**
 * Creates params objects with strict typing of the `args` object to ensure it
 * is valid for the `model` and `action` passed.
 */
export const createParams = <
  Model extends Prisma.ModelName,
  Action extends ActionByModel<Model> = ActionByModel<Model>,
>(
  query: (args: any) => Promise<any>,
  model: Model,
  operation: Action,
  args: ArgsByAction<Model, Action>,
) => ({
  query: query as any,
  model,
  operation: operation as any,
  args: args as any,
});
