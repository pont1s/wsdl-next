<div align="center">
    <h1>wsdl-next</h1>
    <p>wsdl-next is a simple WSDL parcer for Node.js</p>

[![npm version](https://badgen.net/npm/v/wsdl-next)](https://www.npmjs.com/package/wsdl-next)
[![npm downloads](https://badgen.net/npm/dm/wsdl-next)](https://www.npmjs.com/package/wsdl-next)
[![npm downloads](https://badgen.net/npm/license/wsdl-next)](https://www.npmjs.com/package/wsdl-next)
</div>

## Installing

Install with npm

```shell
npm install wsdl-next
```

Install with yarn

```shell
yarn add wsdl-next
```

## Basic Usage

### Create WSDL

WsdlNext(url: string)

```ts
wsdl = await WsdlNext.create('http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL');
```

### getNamespaces

Returns a collection with all available namespaces

```ts
const result = await wsdl.getNamespaces();
```

### getMethodParamsByName

Returns all response/request parameter for a given function name

```ts
{
  params: {
    params: xmldoc.XmlAttributes | xmldoc.XmlAttributes[], 
    name: string,
    namespace: string,
  },
  response: {
    params: xmldoc.XmlAttributes | xmldoc.XmlAttributes[],
    name: string,
    namespace: string,
  }
}
```

```ts
const result = await wsdl.getMethodParamsByName('CountryName');
```

### getAllMethods:

Returns all in WSDL available methods

```ts
 const result = await wsdl.getAllMethods();
```

### getXmlDataAsJson:

Returns data from the given XML as JSON

```ts
const result = WsdlNext.getXmlDataAsJson(xmlResponse);
```

## Credits

wsdl-next was inspired by [wsdlrdr](https://github.com/moszeed/wsdlrdr), rewritten in TypeScript for further improvement.

## License

wsdl-next is released under the MIT License. See the bundled LICENSE file for details.
