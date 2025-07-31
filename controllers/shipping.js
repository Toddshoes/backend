const axios = require('axios');
const API_KEY = 'TEST_0NA3lhp1P0EW1i4qrcL9ymPzKiNOX2YAbyMXyK4q6qE';
const BASE_URL = 'https://api.shipengine.com/v1';
const Product = require('../models/Product');
const User = require('../models/User');
// Configure Axios instance
const shipengineAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'API-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

exports.validateAddress = async (req, res) => {
  try {
    const response = await shipengineAPI.post('/addresses/validate', [req.body.address]);
    res.json(response.data[0]); // Return first validated address
  } catch (error) {
    handleError(res, error);
  }
};

exports.getRates = async (req, res) => {
  try {
    const response = await shipengineAPI.post('/rates', {
      rate_options: {
        ...req.body.rate_options,
        service_codes: ['usps_priority_mail']
      },
      shipment: req.body.shipment
    });

    // Filter results to ONLY include standard "package" type
    const filteredRates = response.data.rate_response.rates.filter(
      rate => rate.package_type === 'package'
    );

    res.json({
      ...response.data,
      rate_response: {
        ...response.data.rate_response,
        rates: filteredRates
      }
    });

  } catch (error) {
    handleError(res, error);
  }
};










exports.listCarriers = async (req, res) => {
  try {
    const response = await shipengineAPI.get('/carriers');
    res.json(response.data.carriers);
  } catch (error) {
    handleError(res, error);
  }
};

// exports.createLabel = async (req, res) => {
//   try {
//     const response = await shipengineAPI.post('/labels', {
//       ...req.body,
//       test_label: true // Include if needed
//     });
//     res.json(response.data);
//   } catch (error) {
//     handleError(res, error);
//   }
// };

// exports.createLabel = async (req, res) => {
//   try {
//     // Get Stamps.com (USPS) carrier
//     const carriersResponse = await shipengineAPI.get('/carriers');
//     const stampsCarrier = carriersResponse.data.carriers.find(
//       c => c.carrier_code === 'stamps_com'
//     );

//     if (!stampsCarrier) {
//       return res.status(400).json({ error: 'Stamps.com carrier not connected' });
//     }

//     // Validate USPS requirements
//     const { shipment } = req.body;
//     const package = shipment.packages[0];
    
//     if (!package.weight || package.weight.unit !== 'ounce') {
//       return res.status(400).json({ 
//         error: 'USPS requires weight in ounces' 
//       });
//     }

//     // Build USPS-compliant request
//     const labelData = {
//       shipment: {
//         carrier_id: stampsCarrier.carrier_id,
//         service_code: 'usps_priority_mail',
//         ship_to: {
//           ...shipment.ship_to,
//           address_residential_indicator: shipment.ship_to.address_residential_indicator || 'yes'
//         },
//         ship_from: {
//           ...shipment.ship_from,
//           address_residential_indicator: shipment.ship_from.address_residential_indicator || 'no'
//         },
//         packages: [
//           {
//             package_code: 'package', // Valid USPS package type
//             weight: package.weight,
//             dimensions: package.dimensions || {
//               length: 12,
//               width: 12,
//               height: 12,
//               unit: 'inch'
//             }
//           }
//         ]
//       },
//       // test_label: true // Remove for production
//     };

//     const response = await shipengineAPI.post('/labels', labelData);
//     res.json(response.data);

//   } catch (error) {
//     handleError(res, error);
//   }
// };




exports.createLabel = async (req, res) => {
  try {
    // 1. Validate request structure
    const { shipment } = req.body;
    if (!shipment?.packages?.length) {
      return res.status(400).json({ error: 'At least one package required' });
    }

    // 2. Get USPS carrier
    const { data: { carriers } } = await shipengineAPI.get('/carriers');
    const uspsCarrier = carriers.find(c => c.carrier_code === 'stamps_com');
    if (!uspsCarrier) return res.status(400).json({ error: 'USPS carrier not connected' });

    // 3. Validate package requirements
    const [pkg] = shipment.packages;
    const errors = [];
    
    // Weight validation
    if (!pkg.weight?.unit || pkg.weight.unit.toLowerCase() !== 'ounce') {
      errors.push('Weight must be in ounces');
    }

    // Dimensions validation
    if (!pkg.dimensions?.unit || !['inch', 'cm'].includes(pkg.dimensions.unit.toLowerCase())) {
      errors.push('Dimensions required with unit (inch/cm)');
    }

    if (errors.length) return res.status(400).json({ errors });

    // 4. Build USPS-compliant request
    const labelData = {
      shipment: {
        carrier_id: uspsCarrier.carrier_id,
        service_code: 'usps_priority_mail',
        ship_to: {
          ...shipment.ship_to,
          address_residential_indicator: shipment.ship_to.address_residential_indicator || 'yes'
        },
        ship_from: {
          ...shipment.ship_from,
          address_residential_indicator: shipment.ship_from.address_residential_indicator || 'no'
        },
        packages: [{
          package_code: 'package',
          weight: pkg.weight,
          dimensions: pkg.dimensions
        }]
      },
      // test_label: true // Keep for sandbox, remove for production
    };

    // 5. Create label
    const { data } = await shipengineAPI.post('/labels', labelData);
    
    res.json({
      label_id: data.label_id,
      tracking_number: data.tracking_number,
      status: data.status,
      label_url: data.label_download?.pdf,
      cost: data.shipment_cost
    });

  } catch (error) {
    // Handle specific USPS validation errors
    if (error.response?.data?.errors?.some(e => e.error_code === 'invalid_weight')) {
      return res.status(400).json({ error: 'Invalid weight format' });
    }
    handleError(res, error);
  }
};









exports.trackShipment = async (req, res) => {
  try {
    const { carrier_code, tracking_number } = req.params;
    const response = await shipengineAPI.get('/tracking', {
      params: { carrier_code, tracking_number }
    });
    res.json(response.data);
  } catch (error) {
    handleError(res, error);
  }
};



exports.checkVoidEligibility = async (req, res) => {
  const { label_id } = req.params;

  try {
    

    // 1. Validate label ID format
    if (!/^se-[a-z0-9]{8,}$/i.test(label_id)) {
      return res.status(400).json({
        error: 'Invalid label ID format',
        expected_format: 'se-XXXXXXXX (8+ characters)'
      });
    }

    // 2. Verify label exists
    const labelResponse = await shipengineAPI.get(`/labels/${label_id}`);
    
    // 3. Check carrier support
    const supportedCarriers = ['stamps_com', 'ups', 'fedex'];
    if (!supportedCarriers.includes(labelResponse.data.carrier_code)) {
      return res.status(400).json({
        error: `Carrier ${labelResponse.data.carrier_code} not supported for void checks`
      });
    }

    // 4. Get void eligibility
    const eligibilityResponse = await shipengineAPI.get(
      `/labels/${label_id}/void-eligibility`
    );

    res.json({
      label_id,
      ...eligibilityResponse.data
    });

  } catch (error) {
    // Handle 404 specifically
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: 'Label not found or already voided',
        label_id
      });
    }
    handleError(res, error);
  }
};



exports.cancelShipment = async (req, res) => {
  try {
    const { label_id } = req.params;
    
    if (!label_id?.startsWith('se-')) {
      return res.status(400).json({ 
        error: 'Invalid label ID format' 
      });
    }

    const response = await shipengineAPI.put(`/labels/${label_id}/void`);

    res.json({
      status: response.data.status || 'voided',
      label_id: response.data.label_id,
      tracking_number: response.data.tracking_number,
      void_success: response.data.void_success
    });

  } catch (error) {
    // Special case handling
    if (error.response?.status === 409) {
      return res.status(409).json({
        error: 'Label already voided or processed'
      });
    }
    handleError(res, error);
  }
};



exports.getLabelStatus = async (req, res) => {
  try {
    const { label_id } = req.params;

    // Validate label ID format
    if (!label_id?.startsWith('se-')) {
      return res.status(400).json({
        error: 'Invalid label ID format - must start with "se-"'
      });
    }

    // Get label details from ShipEngine
    const response = await shipengineAPI.get(`/labels/${label_id}`);
    
    res.json({
      label_id: response.data.label_id,
      status: response.data.status,
      tracking_number: response.data.tracking_number,
      created_at: response.data.created_at,
      shipment_id: response.data.shipment_id
    });

  } catch (error) {
    // Handle 404 specifically
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: 'Label not found',
        label_id: req.params.label_id
      });
    }
    handleError(res, error);
  }
};







// exports.calculateShippingRates = async (req, res) => {
//   try {
//     const { loggedInUserProductId, otherUserProductId } = req.body;
    
//     // Fetch product details
//     const loggedInUserProduct = await Product.findById(loggedInUserProductId);
//     const otherUserProduct = await Product.findById(otherUserProductId);
//     if (!loggedInUserProduct || !otherUserProduct) {
//       return res.status(404).json({ message: 'One or both products not found' });
//     }

//     // Fetch user details
//     const loggedInUser = await User.findById(req.user.id);
//     const otherUser = await User.findById(otherUserProduct.userId);
//     if (!loggedInUser || !otherUser) {
//       return res.status(404).json({ message: 'One or both users not found' });
//     }

//     // Prepare shipment data
//     const shipment1 = {
//       ship_to: {
//         name: `${otherUser.firstName} ${otherUser.lastName}`.trim(),
//         phone: otherUser.phoneNumber || '0000000000',
//         address_line1: otherUser.address,
//         city_locality: otherUser.city,
//         state_province: otherUser.state,
//         postal_code: otherUser.postalcode,
//         country_code: otherUser.country || 'US',
//       },
//       ship_from: {
//         name: `${loggedInUser.firstName} ${loggedInUser.lastName}`.trim(),
//         phone: loggedInUser.phoneNumber || '0000000000',
//         address_line1: loggedInUser.address,
//         city_locality: loggedInUser.city,
//         state_province: loggedInUser.state,
//         postal_code: loggedInUser.postalcode,
//         country_code: loggedInUser.country || 'US',
//       },
//       packages: [
//         {
//           package_code: 'package',
//           weight: { value: loggedInUserProduct.weight || 1.5, unit: 'pound' },
//           dimensions: {
//             length: loggedInUserProduct.width || 12,
//             width: loggedInUserProduct.width || 8,
//             height: loggedInUserProduct.height || 4,
//             unit: 'inch',
//           },
//         },
       
//       ],
//     };


//     const shipment2 = {
//       ship_from: {
//         name: `${otherUser.firstName} ${otherUser.lastName}`.trim(),
//         phone: otherUser.phoneNumber || '0000000000',
//         address_line1: otherUser.address,
//         city_locality: otherUser.city,
//         state_province: otherUser.state,
//         postal_code: otherUser.postalcode,
//         country_code: otherUser.country || 'US',
//       },
//       ship_to: {
//         name: `${loggedInUser.firstName} ${loggedInUser.lastName}`.trim(),
//         phone: loggedInUser.phoneNumber || '0000000000',
//         address_line1: loggedInUser.address,
//         city_locality: loggedInUser.city,
//         state_province: loggedInUser.state,
//         postal_code: loggedInUser.postalcode,
//         country_code: loggedInUser.country || 'US',
//       },
//       packages: [
//         {
//           package_code: 'package',
//           weight: { value: otherUserProduct.weight || 1.5, unit: 'pound' },
//           dimensions: {
//             length: otherUserProduct.width || 12,
//             width: otherUserProduct.width || 8,
//             height: otherUserProduct.height || 4,
//             unit: 'inch',
//           },
//         },

//       ],
//     };

//     // Request shipping rates
//     const response = await shipengineAPI.post('/rates', {
//       rate_options: {
//         carrier_ids: ['se-1918923'],
//         service_codes: ['usps_priority_mail'],
//       },
//       shipment1,
//     });


//     const response1 = await shipengineAPI.post('/rates', {
//       rate_options: {
//         carrier_ids: ['se-1918923'],
//         service_codes: ['usps_priority_mail'],
//       },
//       shipment2,
//     });

//     // Filter results to ONLY include standard "package" type
//     const filteredRates = response.data.rate_response.rates.filter(
//       (rate) => rate.package_type === 'package'
//     );

//     res.json({
//       ...response.data,
//       rate_response: { ...response.data.rate_response, rates: filteredRates },
//     });
//   } catch (error) {
//     console.error(error.response ? error.response.data : error.message);
//     res.status(500).json({ message: 'Error fetching shipping rates' });
//   }
// };






exports.calculateShippingRates = async (req, res) => {
  try {
    const { loggedInUserProductId, otherUserProductId } = req.body;

    const loggedInUserProduct = await Product.findById(loggedInUserProductId);
    const otherUserProduct = await Product.findById(otherUserProductId);
    if (!loggedInUserProduct || !otherUserProduct) {
      return res.status(404).json({ message: 'One or both products not found' });
    }

    const validateDimensions = (product, productName) => {
      const length = product.length || 12;
      const width = product.width || 8;
      const height = product.height || 4;
      const girth = 2 * (width + height);
      const total = length + girth;
      if (total > 108) {
        throw new Error(
          `${productName} dimensions (L:${length}", W:${width}", H:${height}") exceed USPS maximum. ` +
          `Length + girth (${total}") must be ≤ 108"`
        );
      }
    };

    // try {
    //   validateDimensions(loggedInUserProduct, 'Your product');
    // } catch (error) {
    //   return res.status(400).json({
    //     message: error.message,
    //     errorCode: 'SHIPPING_DIMENSIONS_EXCEEDED',
    //     maxAllowed: 108,
    //     errorDetails: error.message
    //   });
    // }

    // try {
    //   validateDimensions(otherUserProduct, "Other user's product");
    // } catch (error) {
    //   return res.status(400).json({
    //     message: error.message,
    //     errorCode: 'SHIPPING_DIMENSIONS_EXCEEDED',
    //     maxAllowed: 108,
    //     errorDetails: error.message
    //   });
    // }

    const loggedInUser = await User.findById(req.user.id);
    const otherUser = await User.findById(otherUserProduct.userId);
    if (!loggedInUser || !otherUser) {
      return res.status(404).json({ message: 'One or both users not found' });
    }

    const prepareShipment = (fromUser, toUser, product) => ({
      ship_to: {
        name: `${toUser.firstName} ${toUser.lastName}`.trim(),
        phone: toUser.phoneNumber || '000-000-0000',
        address_line1: toUser.address || 'Address not provided',
        city_locality: toUser.city || 'Unknown City',
        state_province: toUser.state || 'CA',
        postal_code: toUser.postalcode || '00000',
        country_code: toUser.country || 'US',
      },
      ship_from: {
        name: `${fromUser.firstName} ${fromUser.lastName}`.trim(),
        phone: fromUser.phoneNumber || '000-000-0000',
        address_line1: fromUser.address || 'Address not provided',
        city_locality: fromUser.city || 'Unknown City',
        state_province: fromUser.state || 'CA',
        postal_code: fromUser.postalcode || '00000',
        country_code: fromUser.country || 'US',
      },
      packages: [{
        package_code: 'package',
        weight: {
          value: 32,
          unit: 'ounce'
        },
        dimensions: {
          length: 6,
          width: 14,
          height: 14,
          unit: 'inch'
        }
        // weight: {
        //   value: product.weight || 1.5,
        //   unit: 'pound'
        // },
        // dimensions: {
        //   length: product.length || 12,
        //   width: product.width || 8,
        //   height: product.height || 4,
        //   unit: 'inch'
        // }
      }]
    });

    const shipment1 = prepareShipment(loggedInUser, otherUser, otherUserProduct);
    const shipment2 = prepareShipment(otherUser, loggedInUser, otherUserProduct);

    const [response1, response2] = await Promise.all([
      shipengineAPI.post('/rates', { 
        rate_options: { 
          carrier_ids: ['se-1918923'],
          service_codes: ['usps_priority_mail'],
          package_types: ['package']
        }, 
        shipment: shipment1 
      }),
      shipengineAPI.post('/rates', { 
        rate_options: { 
          carrier_ids: ['se-1918923'],
          service_codes: ['usps_priority_mail'],
          package_types: ['package']
        }, 
        shipment: shipment2 
      }),
    ]);

    const filterPackageRates = (rates) => {
      return rates.filter(rate => 
        rate.service_code === 'usps_priority_mail' && 
        rate.package_type === 'package'
      );
    };

    const outgoingRates = filterPackageRates(response1.data.rate_response?.rates || []);
    const incomingRates = filterPackageRates(response2.data.rate_response?.rates || []);

    if (outgoingRates.length === 0 || incomingRates.length === 0) {
      return res.status(400).json({
        message: 'Requested USPS Priority Mail package rates not available',
        errorCode: 'RATE_UNAVAILABLE',
        details: {
          outgoingAvailable: outgoingRates.length > 0,
          incomingAvailable: incomingRates.length > 0
        }
      });
    }

    const calculateTotal = (rate) => {
      return [
        rate.shipping_amount?.amount || 0,
        rate.other_amount?.amount || 0,
        rate.insurance_amount?.amount || 0,
        rate.confirmation_amount?.amount || 0
      ].reduce((sum, val) => sum + val, 0);
    };

    const outgoingTotal = calculateTotal(outgoingRates[0]);
    const incomingTotal = calculateTotal(incomingRates[0]);
    const totalCost = outgoingTotal + incomingTotal;

    res.json({
      shipments: {
        outgoing: {
          rates: outgoingRates,
          selected: outgoingRates[0],
          total: outgoingTotal.toFixed(2)
        },
        incoming: {
          rates: incomingRates,
          selected: incomingRates[0],
          total: incomingTotal.toFixed(2)
        }
      },
      total_shipping_cost: {
        currency: 'usd',
        amount: totalCost.toFixed(2)
      }
    });

  } catch (error) {
    console.error('Shipping rate error:', error.response?.data || error.message);
    const statusCode = error.response?.status || 500;
    res.status(statusCode).json({
      message: 'Error calculating shipping rates',
      error: error.response?.data || error.message,
      ...(error.response?.data?.errors && { errors: error.response.data.errors })
    });
  }
};







// Generic error handler
function handleError(res, error) {
  console.error('ShipEngine Error:', error.response?.data || error.message);
  const status = error.response?.status || 500;
  const message = error.response?.data?.message || error.message;
  res.status(status).json({ error: message });
}



