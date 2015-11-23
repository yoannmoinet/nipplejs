var manager = new Manager();
return {
    create: function (options) {
        return manager.create(options);
    },
    manager: manager
};
