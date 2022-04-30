import axios, { AxiosResponseHeaders } from 'axios';
import xmldoc, { XmlAttributes, XmlDocument, XmlElement } from 'xmldoc';
import merge from './deepMergeObjectHelper';

interface Namespace {
  params: xmldoc.XmlAttributes | xmldoc.XmlAttributes[],
  name: string,
  namespace: string,
}

class WsdlNext {
  private readonly url: string;

  private wsdl: string;

  constructor(url: string) {
    this.url = url;
  }

  private async request(): Promise<{ headers: AxiosResponseHeaders, data: unknown }> {
    const response = await axios({
      url: this.url,
      method: 'GET',
    });

    return {
      headers: response.headers,
      data: response.data,
    };
  }

  private async getWsdl(): Promise<string> {
    if (typeof this.wsdl !== 'undefined') {
      return this.wsdl;
    }

    const result = await this.request();

    if (result.headers['content-type'].indexOf('xml') === -1) {
      throw new Error('no wsdl/xml response');
    }

    return result.data.toString();
  }

  private static getNameWithoutNamespace(name: string): string {
    const attr = name.split(':');
    if (attr.length > 1) {
      return attr[1];
    }

    return name;
  }

  private static getNamespace(name: string, suffix: boolean): string {
    const attr = name.split(':');
    if (attr.length > 1) {
      if (suffix) {
        return `${attr[0]}:`;
      }

      return attr[0];
    }

    return '';
  }

  private static getWsdlChild(wsdlObj: XmlDocument, name: string, wsdlStruct: string): XmlElement {
    let child = wsdlObj.childNamed(wsdlStruct + name);

    // if not found try some default
    if (!child) {
      child = wsdlObj.childNamed(`wsdl:${name}`);
    }

    return child;
  }

  private static getFormattedAttr(attribute: XmlAttributes): XmlAttributes {
    const attributeTmp = attribute;
    let namespace = '';
    if (attributeTmp.type) {
      attributeTmp.type = WsdlNext.getNameWithoutNamespace(attributeTmp.type);
      namespace = WsdlNext.getNamespace(attributeTmp.type, false);
    }

    if (attributeTmp.element) {
      attributeTmp.element = WsdlNext.getNameWithoutNamespace(attributeTmp.element);
      namespace = WsdlNext.getNamespace(attributeTmp.element, false);
    }

    if (namespace.length !== 0) {
      attributeTmp.namespace = namespace;
    }

    return attributeTmp;
  }

  private static getComplexTypeAttrs(
    complexType: XmlElement,
  ): XmlAttributes | Array<XmlAttributes> {
    if (complexType.children.length === 0) {
      return [];
    }

    let complexTypeName = (complexType.children[0] as XmlElement).name;

    if (!complexTypeName) {
      const foundTypeItem = complexType.children
        .find((typeItem: XmlElement) => typeItem.name) as XmlElement;
      if (foundTypeItem) {
        complexTypeName = foundTypeItem.name;
      }
    }

    const schemaStruct = WsdlNext.getNamespace(complexTypeName, true);

    const sequence = complexType.childNamed(`${schemaStruct}sequence`);

    if (sequence) {
      const sequenceChildren = sequence.children
        .filter((childItem: XmlElement) => childItem.name) as Array<XmlElement>;
      return sequenceChildren
        .map((seqChild) => WsdlNext.getFormattedAttr(seqChild.attr));
    }

    return WsdlNext.getFormattedAttr(complexType.attr);
  }

  private static getMessageAttrs(message: XmlElement, wsdl: XmlDocument): Array<Namespace> {
    const wsdlStruct = WsdlNext.getNamespace(wsdl.name, true);
    const types = WsdlNext.getWsdlChild(wsdl, 'types', wsdlStruct);

    let typeName = (types.children[0] as XmlElement).name;
    if (!typeName) {
      const foundTypeItem = types.children
        .find((typeItem: XmlElement) => typeItem.name) as XmlElement;
      if (foundTypeItem) {
        typeName = foundTypeItem.name;
      }
    }

    const typesStruct = WsdlNext.getNamespace(typeName, true);

    const schema = types.childNamed(`${typesStruct}schema`);
    const complexTypes = schema.childrenNamed(`${typesStruct}complexType`);

    const messageChildren = message.children.filter((childItem: XmlElement) => childItem.name);

    return messageChildren.map((messageChild: XmlElement) => {
      const messageAttr = messageChild.attr;
      const typeNameVal = WsdlNext
        .getNameWithoutNamespace(messageAttr.type || messageAttr.element);

      const returnData = {
        name: messageAttr.name,
        namespace: WsdlNext.getNamespace(messageAttr.type || messageAttr.element, false),
      };

      // first look if schema exists

      // is simple type

      const methodSchema = schema.childWithAttribute('name', typeNameVal);

      if (methodSchema) {
        if (methodSchema.children.length === 0) {
          return {
            params: [], ...returnData, ...WsdlNext.getFormattedAttr(methodSchema.attr),
          };
        }

        // is complex type
        const methodComplexType = methodSchema.childNamed(`${typesStruct}complexType`);
        if (methodComplexType) { // TRUE
          return { ...returnData, params: WsdlNext.getComplexTypeAttrs(methodComplexType) };
        }
      }

      // search in complex types if exists

      const complexType = complexTypes
        .find((complexTypeValue) => complexTypeValue.attr.name === typeName);
      if (complexType) {
        return { ...returnData, params: WsdlNext.getComplexTypeAttrs(complexType) };
      }

      // still no results
      // format message attribute and return this

      return { params: [], ...returnData, ...WsdlNext.getFormattedAttr(messageChild.attr) };
    });
  }

  private static getMessageNode(messages: Array<XmlElement>, nodeName: string): XmlElement {
    return messages.find(
      async (message) => message.attr.name === WsdlNext.getNameWithoutNamespace(nodeName),
    );
  }

  async getNamespaces(): Promise<Array<{ short: string, full: string }>> {
    const wsdlObj = new xmldoc.XmlDocument(await this.getWsdl());
    const wsdlObjAttrNames = Object.keys(wsdlObj.attr);

    return wsdlObjAttrNames.reduce((store: Array<{ short: string, full: string }>, attrKey) => {
      const attrNamespace = WsdlNext.getNamespace(attrKey, false);
      const attrName = WsdlNext.getNameWithoutNamespace(attrKey);

      if (wsdlObj.attr[attrNamespace]) {
        if (!store.find((storeItem) => storeItem.short === attrNamespace)) {
          store.push({
            short: attrNamespace,
            full: wsdlObj.attr[attrNamespace],
          });
        }
      }

      if (attrNamespace.length !== 0) {
        store.push({
          short: attrName,
          full: wsdlObj.attr[attrKey],
        });
      }

      return store;
    }, []);
  }

  async getMethodParamsByName(
    method: string,
  ): Promise<{ request: Array<Namespace>, response: Array<Namespace> }> {
    const wsdlObj = new xmldoc.XmlDocument(await this.getWsdl());
    const wsdlStruct = WsdlNext.getNamespace(wsdlObj.name, true);
    const portType = wsdlObj.childNamed(`${wsdlStruct}portType`);
    const messages = wsdlObj.childrenNamed(`${wsdlStruct}message`);

    // try to get method node
    const methodPortType = portType.childWithAttribute('name', method);
    if (!methodPortType) {
      throw new Error(`method ("${method}") not exists in wsdl`);
    }

    const input = methodPortType.childNamed(`${wsdlStruct}input`);
    const output = methodPortType.childNamed(`${wsdlStruct}output`);

    const inputMessage = WsdlNext
      .getMessageNode(messages, WsdlNext.getNameWithoutNamespace(input.attr.message));

    const outputMessage = WsdlNext
      .getMessageNode(messages, WsdlNext.getNameWithoutNamespace(output.attr.message));

    return {
      request: WsdlNext.getMessageAttrs(inputMessage, wsdlObj),
      response: WsdlNext.getMessageAttrs(outputMessage, wsdlObj),
    };
  }

  async getAllMethods(): Promise<Array<string>> {
    const wsdlObj: XmlDocument = new xmldoc.XmlDocument(await this.getWsdl());
    const wsdlStruct = WsdlNext.getNamespace(wsdlObj.name, true);
    const binding = wsdlObj.childNamed(`${wsdlStruct}binding`);
    const operations = binding.childrenNamed(`${wsdlStruct}operation`);

    return operations.map((operationItem) => operationItem.attr.name).sort();
  }

  private static getValFromXmlElement(xmlElement: XmlElement): { [key: string]: unknown; } {
    const elementName = WsdlNext.getNameWithoutNamespace(xmlElement.name);

    if (!elementName) {
      throw new Error('no elementName');
    }

    let childValues = null;

    if (xmlElement.children && xmlElement.children.length !== 0) {
      const xmlElementChildren = xmlElement.children
        .filter((xmlItem: XmlElement) => xmlItem.name) as Array<XmlElement>;

      if (xmlElementChildren.length !== 0) {
        childValues = xmlElementChildren.reduce((store: XmlElement, childItem) => {
          const storeTmp = store;

          if (storeTmp[elementName]) {
            const addable = WsdlNext.getValFromXmlElement(childItem);
            if (addable) {
              if (Object(storeTmp[elementName]) === storeTmp[elementName]) {
                Object.keys(addable).forEach((addKey) => {
                  if (store[elementName][addKey]) {
                    if (!Array.isArray(storeTmp[elementName][addKey])) {
                      storeTmp[elementName][addKey] = [storeTmp[elementName][addKey]];
                    }

                    storeTmp[elementName][addKey].push(addable[addKey]);
                  } else {
                    storeTmp[elementName][addKey] = addable[addKey];
                  }
                });

                return storeTmp;
              }
            }
          } else {
            storeTmp[elementName] = WsdlNext.getValFromXmlElement(childItem);
          }

          return store;
        }, {} as XmlElement);
      }
    }

    let response = {};

    const xmlValue = xmlElement.val
      .replace(/[\n\r\t]/g, '')
      .trim();

    if (xmlValue.length !== 0) {
      response[elementName] = xmlValue;
    }

    if (xmlElement.attr && Object.keys(xmlElement.attr).length !== 0) {
      if (response[elementName]) {
        response[elementName] = { value: response[elementName] };
      }
      response[elementName] = { ...response[elementName], ...xmlElement.attr };
    }

    if (childValues) {
      response = merge(response, childValues);
    }

    return response;
  }

  static getXmlDataAsJson(xml: string): { [key: string]: unknown; } {
    const xmlObj = new xmldoc.XmlDocument(xml);
    const xmlNamespace = WsdlNext.getNamespace(xmlObj.name, true);

    let extractNode = xmlObj.childNamed(`${xmlNamespace}Body`);
    if (!extractNode) {
      extractNode = xmlObj;
    }

    const extractedData = WsdlNext.getValFromXmlElement(extractNode);

    if (extractedData.Body) {
      return extractedData.Body as { [key: string]: unknown; };
    }

    return extractedData;
  }
}

export { WsdlNext, Namespace };
