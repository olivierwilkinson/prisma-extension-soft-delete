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
  findUnique: jest.MockedFn<DelegateByModel<M>["findUnique"]> & {
    query: jest.Mock;
  };
  findUniqueOrThrow: jest.MockedFn<DelegateByModel<M>["findUnique"]> & {
    query: jest.Mock;
  };
  findFirst: jest.MockedFn<DelegateByModel<M>["findFirst"]> & {
    query: jest.Mock;
  };
  findFirstOrThrow: jest.MockedFn<DelegateByModel<M>["findFirst"]> & {
    query: jest.Mock;
  };
  findMany: jest.MockedFn<DelegateByModel<M>["findMany"]> & {
    query: jest.Mock;
  };
  aggregate: jest.MockedFn<DelegateByModel<M>["aggregate"]> & {
    query: jest.Mock;
  };
  create: jest.MockedFn<DelegateByModel<M>["create"]> & {
    query: jest.Mock;
  };
  createMany: jest.MockedFn<DelegateByModel<M>["createMany"]> & {
    query: jest.Mock;
  };
  delete: jest.MockedFn<DelegateByModel<M>["delete"]> & {
    query: jest.Mock;
  };
  deleteMany: jest.MockedFn<DelegateByModel<M>["deleteMany"]> & {
    query: jest.Mock;
  };
  update: jest.MockedFn<DelegateByModel<M>["update"]> & {
    query: jest.Mock;
  };
  updateMany: jest.MockedFn<DelegateByModel<M>["updateMany"]> & {
    query: jest.Mock;
  };
  upsert: jest.MockedFn<DelegateByModel<M>["upsert"]> & {
    query: jest.Mock;
  };
  groupBy: jest.MockedFn<DelegateByModel<M>["groupBy"]> & {
    query: jest.Mock;
  };
  count: jest.MockedFn<DelegateByModel<M>["count"]> & {
    query: jest.Mock;
  };
};

function initModel(callbacks: Partial<{ [key in Operation]: jest.Mock }> = {}) {
  return operations.reduce<any>((acc, operation) => {
    acc[operation] = jest.fn(callbacks[operation] || (() => null));
    acc[operation].query = jest.fn();
    return acc;
  }, {});
}

export class MockClient {
  user: MockOperations<"User">;
  profile: MockOperations<"Profile">;
  post: MockOperations<"Post">;
  comment: MockOperations<"Comment">;
  extendedClients: Array<MockClient> = [];

  constructor(
    callbacks: Partial<
      { [key in Model]: Partial<{ [opKey in Operation]: jest.Mock }> }
    > = {}
  ) {
    this.user = initModel(callbacks.user);
    this.profile = initModel(callbacks.profile);
    this.post = initModel(callbacks.post);
    this.comment = initModel(callbacks.comment);
  }

  $extends(extension: any) {
    const ext =
      typeof extension === "function"
        ? extension({ ...this, $extends: (_ext: any) => _ext })
        : extension;

    const newClient = new MockClient();

    models.forEach((model) => {
      operations.forEach((operation) => {
        const query = jest.fn((_) => null);

        // @ts-ignore
        newClient[model][operation] = jest.fn((args) => {
          return ext.query.$allModels.$allOperations({
            model: model[0].toUpperCase() + model.slice(1),
            operation,
            args,
            query,
          });
        });

        newClient[model][operation].query = query;
      });
    });

    this.extendedClients.push(newClient);

    return newClient;
  }

  reset() {
    operations.forEach((operation) => {
      models.forEach((model) => {
        this[model as Model][operation as Operation].mockReset();
        this[model as Model][operation as Operation].query.mockReset();
      });
    });
    this.extendedClients.forEach((client) => {
      client.reset();
    });
  }
}

export default new MockClient();
