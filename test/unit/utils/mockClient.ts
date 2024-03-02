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

const models = ["user", "profile", "post", "comment"] as const;
const operations = [
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "aggregate",
  "create",
  "createMany",
  "delete",
  "deleteMany",
  "update",
  "updateMany",
  "upsert",
  "count",
  "groupBy",
] as const;

type Operation = typeof operations[number];
type Model = typeof models[number];

type MockOperations<M extends Prisma.ModelName> = {
  findUnique: jest.MockedFn<DelegateByModel<M>["findUnique"]>;
  findUniqueOrThrow: jest.MockedFn<DelegateByModel<M>["findUnique"]>;
  findFirst: jest.MockedFn<DelegateByModel<M>["findFirst"]>;
  findFirstOrThrow: jest.MockedFn<DelegateByModel<M>["findFirst"]>;
  findMany: jest.MockedFn<DelegateByModel<M>["findMany"]>;
  aggregate: jest.MockedFn<DelegateByModel<M>["aggregate"]>;
  create: jest.MockedFn<DelegateByModel<M>["create"]>;
  createMany: jest.MockedFn<DelegateByModel<M>["createMany"]>;
  delete: jest.MockedFn<DelegateByModel<M>["delete"]>;
  deleteMany: jest.MockedFn<DelegateByModel<M>["deleteMany"]>;
  update: jest.MockedFn<DelegateByModel<M>["update"]>;
  updateMany: jest.MockedFn<DelegateByModel<M>["updateMany"]>;
  upsert: jest.MockedFn<DelegateByModel<M>["upsert"]>;
  groupBy: jest.MockedFn<DelegateByModel<M>["groupBy"]>;
  count: jest.MockedFn<DelegateByModel<M>["count"]>;
};

function initModel(callbacks: Partial<{ [key in Operation]: jest.Mock }> = {}) {
  return operations.reduce<any>((acc, operation) => {
    acc[operation] = callbacks[operation] || jest.fn(() => null);
    return acc;
  }, {});
}

export class MockClient {
  user: MockOperations<"User">;
  profile: MockOperations<"Profile">;
  post: MockOperations<"Post">;
  comment: MockOperations<"Comment">;

  ext: {
    model: {
      user?: MockOperations<"User">;
      profile?: MockOperations<"Profile">;
      post?: MockOperations<"Post">;
      comment?: MockOperations<"Comment">;
    };
  };

  constructor(
    callbacks: Partial<
      { [key in Model]: Partial<{ [opKey in Operation]: jest.Mock }> }
    > = {}
  ) {
    this.user = initModel(callbacks.user);
    this.profile = initModel(callbacks.profile);
    this.post = initModel(callbacks.post);
    this.comment = initModel(callbacks.comment);
    this.ext = {
      model: {
        user: initModel(),
        profile: initModel(),
        post: initModel(),
        comment: initModel(),
      },
    };
  }

  $extends(extension: any) {
    const ext =
      typeof extension === "function"
        ? extension({ ...this, $extends: (_ext: any) => _ext })
        : extension;

    const newClient = new MockClient();

    Object.keys(ext.model || {}).forEach((model) => {
      const modelName = model as keyof MockClient["ext"]["model"];
      if (!models.includes(modelName)) {
        throw new Error(`Invalid model name in mock client ${modelName}`);
      }

      newClient.ext.model[modelName] = Object.keys(ext.model[modelName]).reduce<
        any
      >((acc, operation) => {
        acc[operation] = jest.fn(ext.model[modelName][operation]);
        return acc;
      }, {});

      Object.keys(newClient[modelName]).forEach((operation) => {
        newClient[modelName][operation as Operation].mockImplementation(
          // @ts-ignore
          (args) => {
            const hook = newClient.ext.model[modelName as Model]?.[
              operation as Operation
            ];

            if (!hook)
              throw new Error(`No hook found for ${model}.${operation}`);

            return hook(args as any);
          }
        );
      });
    });

    return newClient;
  }

  reset() {
    operations.forEach((operation) => {
      models.forEach((model) => {
        this[model as Model][operation as Operation].mockReset();
      });
    });
    models.forEach((model) => {
      if (this.ext.model[model as keyof MockClient["ext"]["model"]]) {
        operations.forEach((operation) => {
          this.ext.model[model as Model]?.[operation as Operation].mockReset();
        });
      }
    });
  }
}

export default new MockClient();
