var factory = new Manager();
return {
    create: function (options) {
        return factory.create(options);
    },
    factory: factory
};
