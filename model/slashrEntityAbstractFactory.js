import { slashrEntity } from './slashrEntity';

export class slashrEntityAbstractFactory{
	constructor(slashr){
		console.log("RETURNING PROXY!");
		let self = this;
		return new Proxy(function(){}, {
			get : function(obj, prop){
				// Include the domain
				// Instaniate the entity
				return async (key, options) => {
					let entity = new slashrEntity(slashr, prop, options);
					await entity._load();
					if(key) await entity.init(key);
					return entity;
				};
			}
		});
	}
}