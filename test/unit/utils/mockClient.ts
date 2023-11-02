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
];

class MockClient {
  $allOperations: any;
  user: any;

  constructor() {
    this.user = operations.reduce<any>((acc, operation) => {
      acc[operation] = jest.fn(() => null);
      return acc;
    }, {});
  }

  $extends(extension: any) {
    const ext = typeof extension === "function" ? extension(this) : extension;
    const $allOperations =
      ext instanceof MockClient
        ? ext.$allOperations
        : ext.query.$allModels.$allOperations;

    const newClient = new MockClient();
    newClient.$allOperations = $allOperations.bind(this);

    newClient.user = operations.reduce<any>((acc, operation) => {
      acc[operation] = jest.fn((params: any) => {
        // @ts-ignore
        return this.$allOperations({
          model: "User",
          action: operation,
          args: params,
        });
      });
      return acc;
    }, {});

    return newClient;
  }
  
  reset() {
    operations.forEach((operation) => {
      this.user[operation].mockReset();
    });
  }
}

export default new MockClient();
