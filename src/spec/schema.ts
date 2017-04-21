import { Schema } from 'swagger-schema-official';
import { Tyr } from 'tyranid';
import { SchemaContainer, SchemaOptions } from '../interfaces';
import { each, error, options, pascal } from '../utils';

/**
 * strings for elements in property path
 * that do not have names
 */
const PATH_MARKERS = {
  ARRAY: '_',
  HASH: '[key: string]'
};

/**
 * Given a tyranid schema, produce an object schema
 * to insert into the Open API spec.
 *
 * @param def a tyranid collection schema schema object
 */
export function schema(
  def: Tyr.CollectionDefinitionHydrated,
) {
  const name = pascal(def.name);

  const out: SchemaContainer = {
    name,
    id: def.id,
    schema: {
      type: 'object',
      properties: schemaObject(def.fields)
    }
  };

  return out;
}

/**
 * extend a given path with a new property
 *
 * @param path current path
 * @param next name of next property
 */
function extendPath(
  next: string,
  path?: string
) {
  if (!path) return next;

  return `${path}.${next}`;
}

/**
 * Convert hash of tyranid fields to hash of Open API schema
 *
 * @param fields hash of tyranid field instances
 * @param path property path in schema of current field hash
 */
function schemaObject(
  fields: { [key: string]: Tyr.FieldInstance },
  path?: string
) {
  const properties: { [key: string]: Schema } = {};

  each(fields, (field, name) => {
    properties[name] = schemaType(
      field, extendPath(name, path)
    );
  });

  return properties;
}

/**
 * Translate a tyranid field to a Open API definition
 *
 * @param field tyranid schema field
 * @param path property path in schema of current field
 */
function schemaType(
  field: Tyr.FieldInstance,
  path: string
) {
  // TODO: should links be refs?
  const type = field.def.link
    ? 'string'
    : field.def.is;

  const opts = options(field.def);
  const out: Schema = {};

  switch (type) {

    /**
     * pass through types from tyranid
     */
    case 'password':
    case 'boolean':
    case 'integer':
    case 'double':
    case 'string':
    case 'date': {
      Object.assign(out, { type });
      break;
    }

    /**
     * string aliases
     */
    case 'mongoid':
    case 'email': {
      Object.assign(out, { type: 'string' });
      break;
    }

    /**
     * array types
     */
    case 'array': {
      const element = field.of;
      if (!element) {
        return error(`
          field "${path}" is of type \`array\`
          but missing an \`of\` property
        `);
      }

      Object.assign(out, {
        type: 'array',
        items: schemaType(element, extendPath(PATH_MARKERS.ARRAY, path))
      });
      break;
    }

    /**
     * nested objects
     */
    case 'object': {
      const keys = field.keys;
      const values = field.of;
      const subfields = field.fields;

      Object.assign(out, {
        type: 'object'
      });

      /**
       * if the sub object is a hash
       */
      if (keys) {
        if (!values) {
          return error(`
            field "${path}" is of type \`object\` and has a keys
            property but no values property.
          `);
        }

        // TODO: once https://github.com/DefinitelyTyped/DefinitelyTyped/pull/15866 is merged,
        // pull in new typings and remove any cast.
        /* tslint:disable */
        (<any> out).additionalProperties = schemaType(
          values,
          extendPath(PATH_MARKERS.HASH, path)
        );
        /* tslint:enable */

        break;
      }

      /**
       * if the sub object has a defined schema
       */
      if (!subfields) {
        return error(
          `field "${path}" is of type \`object\` but
          has no \`fields\` property`
        );
      }

      out.properties = schemaObject(subfields, path);

      break;
    }

    default: return error(`field "${path}" is of unsupported type: ${type}`);
  }

  /**
   * add formats
   */
  switch (out.type) {

    case 'integer': {
      out.format = 'i32';
      break;
    }

  }

  /**
   * add note from schema
   */
  if (opts.note || field.def.note) {
    out.description = (
      opts.note || field.def.note || ''
    ).replace(/\t+/mg, '');
  }

  return out;
}