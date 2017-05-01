import { Tyr } from 'tyranid';
import { SchemaContainer } from '../interfaces';
/**
 * Given a tyranid schema, produce an object schema
 * to insert into the Open API spec.
 *
 * @param def a tyranid collection schema schema object
 */
export declare function schema(def: Tyr.CollectionDefinitionHydrated): SchemaContainer;