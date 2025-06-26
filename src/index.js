import Manager from './manager';

let factory;
if(typeof window !== 'undefined'){
    factory = new Manager();
}
export default {
    create: function (options) {
        if(!factory) {
            throw new Error('Nipplejs library can only run in a browser. \'window\' is not defined.');
        }
        return factory.create(options);
    },
    factory: factory
};
