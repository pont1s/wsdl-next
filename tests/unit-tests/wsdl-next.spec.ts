import { WsdlNext } from '../../src';

class NoErrorThrownError extends Error {}

const getError = async <TError>(call: () => unknown): Promise<TError> => {
  try {
    await call();
    throw new NoErrorThrownError();
  } catch (error: unknown) {
    return error as TError;
  }
};

describe('soap-next', () => {
  let wsdl: WsdlNext;

  beforeEach(async () => {
    wsdl = await WsdlNext.create('http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso?WSDL');
  });

  test('Check constructor created', async () => {
    expect(wsdl).toBeDefined();
  });

  test('Check error with not XML response', async () => {
    const error = await getError(async () => WsdlNext.create('http://webservices.oorsprong.org/websamples.countryinfo/CountryInfoService.wso'));
    expect(error).not.toBeInstanceOf(NoErrorThrownError);
  });

  test('Check return all function', async () => {
    const result = await wsdl.getAllMethods();
    expect(result).toContain('CountryName');
  });

  test('Check method params', async () => {
    const result = await wsdl.getMethodParamsByName('CountryName');
    expect(result).toBeDefined();
  });

  test('Check get namespaces', async () => {
    const result = await wsdl.getNamespaces();
    expect(result).toBeDefined();
  });

  test('Check transform xml to object', async () => {
    const xmlResponse = '<?xml version="1.0" encoding="utf-8"?>\n'
      + '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">\n'
      + '<soap:Body>\n'
      + '<m:CountryNameResponse xmlns:m="http://www.oorsprong.org/websamples.countryinfo">\n'
      + '<m:CountryNameResult>United States</m:CountryNameResult>\n'
      + '</m:CountryNameResponse>\n'
      + '</soap:Body>\n'
      + '</soap:Envelope>\n';
    const result = WsdlNext.getXmlDataAsJson(xmlResponse);
    expect(result).toBeDefined();
  });
});
