const path = require('path')
const fs = require('fs')
const util = require('util')
const History = require('../models/History')
const Structure = require('../models/Structure')
const Prompt = require('../models/Prompt')
const ErrorResponse = require('../utils/errorResponse')




// const anthropic = new Anthropic();

// const anthropic = AnthropicSDK.createClient({
//   apiKey: 'YOUR_API_KEY'
// });

// const AWS = require('../config/aws-config')
// const s3 = new AWS.S3({
//   region: 'us-east-2'
// });

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')

const s3Client = new S3Client({
  region: 'us-east-2',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
  },
})

const OPENAI_API_KEY = process.env.OPENAI_KEY



const fetch = require('node-fetch')

const asyncHandler = require('../middleware/async')
const User = require('../models/User')

const { Transform } = require('stream')

const GPT_3_5_TURBO_MAX_TOKENS = 4096
const GPT_4_MAX_TOKENS = 120000

const getReponse = async (req, res, next) => {
  try {
    // Destructure properties from the request body
    const { message, id, model, temprature } = req.body

    let tempratureLocal = temprature ? parseFloat(temprature) : 1

    // Check if user has free credits and is not on a pro account
    const userinfo = await User.findById(req.user.id)
    if (userinfo.freeCreditsAvailable <= 0 && userinfo.proAccount == false) {
      return res.status(500).json({
        message:
          'Your free credits are ended, please upgrade to pro to continue',
      })
    } else {
      // If user is not on a pro account, decrement free credits
      if (userinfo.proAccount == false) {
        tempratureLocal = 1
        userinfo.freeCreditsAvailable = userinfo.freeCreditsAvailable - 1
        await userinfo.save()
      }
    }

    let modelname
    let maxTokens

    // Determine the model based on the specified version
    if (model == '3.5') {
      modelname = 'gpt-3.5-turbo'
      maxTokens = GPT_3_5_TURBO_MAX_TOKENS
    } else if (model == '4') {
      if (userinfo.proAccount == false) {
        return res.status(500).json({
          success: false,
          message: 'please upgrade to pro to use GPT-4',
        })
      } else {
        modelname = 'gpt-4-1106-preview'
        maxTokens = GPT_4_MAX_TOKENS
      }
    }

    // Set the user's input as the prompt
    const prompt = message

    // Find the structure based on the provided ID
    const structure = await Structure.findById(id)

    // Return an error if the structure is not found
    if (!structure) {
      return next(new ErrorResponse(`Please create a Chat to continue`, 404))
    }

    const histories = await History.find({
      structure: id,
      user: req.user.id,
    })
      .sort({ createdAt: 1 })
      .select('role content')

    const lastTenMessages = histories.slice(-10)

    // Use OpenAI API to generate a response
    const response = await openai.chat.completions.create({
      model: modelname,
      temperature: tempratureLocal,
      messages: [
        ...lastTenMessages.map((history) => {
          return {
            role: history.role,
            content: history.content,
          }
        }),
        {
          role: 'system',
          content:
            "You are ChatGPT, a large language model trained by OpenAI. Follow the user's instructions carefully. Respond using markdown.",
        },
        { role: 'user', content: prompt },
      ],
      stream: true,
    })
    // Set response headers
    res.setHeader('Content-Type', 'text/html; charset=utf-8')

    let assistantResponse = ''

    // Process each chunk of the response and send it to the client
    for await (const chunk of response) {
      const content = chunk.choices[0]?.delta?.content || ''
      assistantResponse += content
      res.write(content)
    }

    // Save user's input to history
    await History.create({
      structure: id,
      role: 'user',
      content: prompt,
      user: req.user.id,
    })

    // Save assistant's response to history
    await History.create({
      structure: id,
      role: 'assistant',
      content: assistantResponse,
      user: req.user.id,
    })

    // End the response
    res.end()
  } catch (error) {
    // Handle errors
    console.error(error)
    next(error)
  }
}

const getClaudeResponse = async (req, res, next) => {
  const { message, id, model, temprature } = req.body

  let tempratureLocal = temprature ? parseFloat(temprature) : 1

  if (req.user.proAccount == false) {
    return res.status(500).json({ message: 'Please Upgrade to Pro to use it' })
  }

  const structure = await Structure.findById(id)

  if (!structure) {
    return next(new ErrorResponse(`Please create a Chat to continue`, 404))
  }

  let histories = await History.find({
    structure: id,
    user: req.user.id,
  })
    .sort({ createdAt: 1 })
    .select('role content')

  const lastTenMessages = histories.slice(-10)

  const url = 'https://api.anthropic.com/v1/messages'
  const headers = {
    'anthropic-version': '2023-06-01',
    'anthropic-beta': 'messages-2023-12-15',
    'content-type': 'application/json',
    'x-api-key': process.env.ANTHROPIC_API_KEY,
  }

  const body = JSON.stringify({
    model: 'claude-3-opus-20240229',
    messages: [
      ...lastTenMessages.map((history) => ({
        role: history.role,
        content: history.content,
      })),
      { role: 'user', content: message },
      {
        role: 'assistant',
        content:
          "Assume you're a sophisticated language model developed by Anthropic. Please respond in Markdown format, beginning your answer immediately without mentioning formatting details.",
      },
    ],
    max_tokens: 1024,
    stream: true,
  })

  let accumulatedResponse = ''
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: headers,
      body: body,
    })

    if (!response.ok) {
      throw new Error('Unable to Get Response')
    }

    if (response.body) {
      // Wrap streaming and accumulation logic inside a Promise
      const streamPromise = new Promise((resolve, reject) => {
        const textTransformer = new Transform({
          transform(chunk, encoding, callback) {
            const chunkStr = chunk.toString()
            const lines = chunkStr.split('\n')

            lines.forEach((line) => {
              if (line.startsWith('data:')) {
                try {
                  const data = JSON.parse(line.substring(5))
                  if (data.delta && data.delta.type === 'text_delta') {
                    this.push(data.delta.text)
                    accumulatedResponse += data.delta.text
                  }
                } catch (e) {
                  console.error('Error parsing JSON from data line:', e)
                }
              }
            })
            callback()
          },
          final(callback) {
            // Resolve the promise when stream finishes
            resolve()
            callback()
          },
        })

        // Set the response headers
        res.setHeader('Content-Type', 'text/markdown')
        // Pipe the response body through the transformer and then to the client
        response.body.pipe(textTransformer).pipe(res)
      })

      // Wait for the stream to finish and then save history
      streamPromise.then(async () => {
        // Save user's input to history
        await History.create({
          structure: id,
          role: 'user',
          content: message,
          user: req.user.id,
        })

        // Save assistant's response to history
        await History.create({
          structure: id,
          role: 'assistant',
          content: accumulatedResponse,
          user: req.user.id,
        })
      })
    }
    // else {
    //   // If the response body is not streamable, fall back to a standard response
    //   const data = await response.json();
    //   res.send(data);
    // }
  } catch (error) {
    console.error('Fetch error:', error)
    res
      .status(500)
      .json({ success: false, message: 'Error fetching response from Claude' })
  }
}

const generateImage = async (req, res, next) => {
  try {
    const { message, id } = req.body

    const user = await User.findById(req.user.id).select('proAccount')

    if (!user.proAccount) {
      return next(new ErrorResponse(`Please Upgrade to Pro to use it`, 404))
    }

    const structure = await Structure.findById({ _id: id })

    if (!structure) {
      return next(new ErrorResponse(`Please create a Chat to continue`, 404))
    }

    // Simulating the image generation and getting the URL
    const imageResponse = await openai.images.generate({
      model: 'dall-e-3',
      prompt: message,
      size: '1024x1024',
    })
    const imageUrl = imageResponse.data[0].url

    // Respond immediately with the image URL
    res.status(200).json({
      success: true,
      message: `Image generated successfully.`,
      imageUrl: imageUrl, // Send the direct URL to the generated image
    })

    // Start the upload process in the background
    ;(async () => {
      try {
        const response = await fetch(imageUrl)
        if (!response.ok)
          throw new Error(`Failed to fetch image: ${response.statusText}`)

        const buffer = await (response.arrayBuffer
          ? response.arrayBuffer()
          : response.blob())

        const imageName = `image-${Date.now()}.png`
        const key = `${id}/${imageName}` // Organize images by 'id' in folders

        // Upload to S3
        const putObjectCommand = new PutObjectCommand({
          Bucket: process.env.AWS_S3_BUCKET_NAME_GENERATED_IMAGES,
          Key: key,
          Body: buffer,
          ContentType: 'image/png',
        })

        await s3Client.send(putObjectCommand)

        await History.create({
          structure: id,
          role: 'user',
          content: message,
          user: req.user.id,
        })

        await History.create({
          structure: id,
          role: 'assistant',
          user: req.user.id,
          imageKey: key,
          content: 'Image Generated',
        })
      } catch (uploadError) {
        console.error('Error uploading image to S3:', uploadError)
        // Handle the error appropriately
      }
    })()
  } catch (error) {
    console.error(error)
    res.status(500).json({
      success: false,
      message: error.message,
    })
  }
}

const downloadImage = async (req, res, next) => {
  const { imageKey, imageURL } = req.query

  let imageUrl

  if (imageKey) {
    imageUrl = `https://chadgpt-images.s3.us-east-2.amazonaws.com/${imageKey}`
  } else if (imageURL && validateImageUrl(imageURL)) {
    imageUrl = imageURL
  } else {
    return res.status(400).send('Invalid image source or domain not allowed.')
  }

  try {
    const response = await fetch(imageUrl)
    if (response.ok) {
      const filename =
        `ChadGPT_downloadedImage_${new Date().toISOString()}.jpg`.replace(
          /[:\-]|\.\d{3}/g,
          '',
        )
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      res.setHeader('Content-Type', 'image/jpeg')
      response.body.pipe(res)
    } else {
      res.status(response.status).send('Image not found')
    }
  } catch (error) {
    console.error(error)
    res.status(500).send('Error downloading image')
  }
}

// const generateImage = async (req, res, next) => {
//   try {
//     const { message, id } = req.body;

//     const user = await User.findById(req.user.id).select('proAccount');

//     if (!user.proAccount) {
//       return next(new ErrorResponse(`Please Upgrade to Pro to use it`, 404));
//     }

//     const structure = await Structure.findById({ _id: id });

//     if (!structure) {
//       return next(new ErrorResponse(`Please create a Chat to continue`, 404));
//     }

//     // Simulating the image generation and getting the URL
//     const imageResponse = await openai.images.generate({ model: "dall-e-3", prompt: message });
//     console.log(imageResponse.data);
//     const imageUrl = imageResponse.data[0].url;

//     const response = await fetch(imageUrl);
//     if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

//     const buffer = await (response.arrayBuffer ? response.arrayBuffer() : response.blob());

//     // Instead of saving locally, upload to S3
//     const imageName =  `image-${Date.now()}.png`;
//     const key = `${id}/${imageName}`; // Organize images by 'id' in folders

//     // Upload to S3
//     const putObjectCommand = new PutObjectCommand({
//       Bucket: process.env.AWS_S3_BUCKET_NAME_GENERATED_IMAGES,
//       Key: key,
//       Body: buffer,
//       ContentType: 'image/png',

//     });

//     await s3Client.send(putObjectCommand);

//     console.log(`Image uploaded to S3 with key ${key}`);

//     await History.create({
//       structure: id,
//       role: 'user',
//       content: message,
//       user: req.user.id,
//     })

//     await History.create({
//       structure: id, // Assuming 'structure' is the correct reference to 'id'
//       role: 'assistant', // or 'user', depending on your logic
//       content: `Image saved in S3 as ${imageName}`,
//       user: req.user.id,
//       imageKey: key,
//     });

//     res.status(200).json({
//       success: true,
//       message: `Image saved in S3 as ${imageName}`,
//       imageUrl: key
//     });
//   } catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// };

// const generateImage = async (req, res, next) => {
//   try{
//     const image = await openai.images.generate({ model: "dall-e-3", prompt: "short story" });
//     // image_url = response.data.data[0].url;

//     res.status(200).json({
//       success: true,
//       data: image.data.data,
//     });

//   }
//   catch (error) {
//     console.error(error);
//     res.status(500).json({
//       success: false,
//       message: error.message,
//     });
//   }
// }
const getHistoryTreeData = asyncHandler(async (req, res, next) => {
  // const rootHistoryFolder = await HistoryStructure.find({ email, parent: 0 });
  // const rootHistoryFolder = await Structure.find({
  //   parent: 0,
  //   user: req.user.id,
  //   category: 'History',
  // })

  // // check if root folder exists
  // if (rootHistoryFolder.length === 0) {
  //   await Structure.create({
  //     user: req.user.id,
  //     parent: 0,
  //     droppable: true,
  //     text: 'History',
  //     type: 'Folder',
  //     category: 'History',
  //   })
  // }

  let historyData = await Structure.find({
    user: req.user.id,
    category: 'History',
  })
  historyData = historyData.map((doc) => {
    return {
      ...doc.toObject(),
      id: doc._id,
    }
  })

  res.status(200).send({ tree: historyData })
})

const getPromptTreeData = asyncHandler(async (req, res, next) => {
  // Find the root prompt folder for the current user
  const rootPromptFolder = await Structure.find({
    parent: 0, //  0 represents the root folder
    user: req.user.id, // The user ID is taken from the request
    category: 'Prompt', // Filter by category "Prompt"
  })

  // Check if the root folder doesn't exist
  if (rootPromptFolder.length === 0) {
    // Create the root prompt folder if it doesn't exist
    await Structure.create({
      user: req.user.id, // User ID
      parent: 0, // Parent is 0 for the root folder
      droppable: true, // Indicate whether it can accept dropped items
      text: 'Prompt', // Display text for the folder
      type: 'Folder', // Type is "Folder" for a folder
      category: 'Prompt', // Category is "Prompt"
    })
  }

  // Retrieve all prompt data for the user
  let promptData = await Structure.find({
    user: req.user.id, // User ID
    category: 'Prompt', // Filter by category "Prompt"
  })

  // Map the retrieved data to a new format
  promptData = promptData.map((doc) => {
    return {
      ...doc.toObject(),
      id: doc._id, // Use _id as id for consistency
    }
  })

  // Send the mapped prompt data as the response
  res.status(200).send({ result: promptData })
})

const getSystemTreeData = asyncHandler(async (req, res, next) => {
  const rootPromptFolder = await Structure.find({
    parent: 0,

    category: 'System',
  })

  // check if root folder exists

  if (rootPromptFolder.length === 0) {
    await Structure.create({
      parent: 0,
      droppable: true,
      text: 'Ultimate Prompt',
      type: 'Folder',
      category: 'System',
    })
  }

  let promptData = await Structure.find({
    category: 'System',
  })
  promptData = promptData.map((doc) => {
    return {
      ...doc.toObject(),
      id: doc._id,
    }
  })

  res.status(200).send({ result: promptData })
})

// Done
const deleteStructure = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  // Check User and delete by id

  let struct = await Structure.findOne({ _id: id, user: req.user.id })

  if (!struct) {
    return next(new ErrorResponse(`No Structure with the id of ${id}`, 404))
  }

  struct = await Structure.findOneAndDelete({ _id: id, user: req.user.id })

  // Also delete all the children of the structure

  const children = await Structure.find({ parent: id, user: req.user.id })

  if (children.length > 0) {
    await Structure.deleteMany({ parent: id, user: req.user.id })
  }

  res.status(200).json({
    success: true,
  })
})

// Done
const deleteSystemStructure = asyncHandler(async (req, res, next) => {
  const { id } = req.params

  // Check User and delete by id

  let struct = await Structure.findOne({ _id: id })

  if (!struct) {
    return next(new ErrorResponse(`No Structure with the id of ${id}`, 404))
  }

  struct = await Structure.findOneAndDelete({ _id: id })

  // Also delete all the children of the structure

  const children = await Structure.find({ parent: id })

  if (children.length > 0) {
    await Structure.deleteMany({ parent: id })
  }

  res.status(200).json({
    success: true,
  })
})

const updateStructureNew = asyncHandler(async (req, res, next) => {
  const { folder, file, tree } = req.body
  console.log('folder', folder)
  console.log('file', file)

  const fileUpdate = await Structure.findOne({ _id: file, user: req.user.id })

  if (!fileUpdate) {
    return next(
      new ErrorResponse(`No Structure with the id of ${file.id}`, 404),
    )
  }

  fileUpdate.parent = folder

  await fileUpdate.save()

  let resultTree

  if (tree == 'history') {
    resultTree = await Structure.find({
      user: req.user.id,
      category: 'History',
    })
    resultTree = resultTree.map((doc) => {
      return {
        ...doc.toObject(),
        id: doc._id,
      }
    })
  } else if (tree == 'prompt') {
    resultTree = await Structure.find({
      user: req.user.id,
      category: 'Prompt',
    })
    resultTree = resultTree.map((doc) => {
      return {
        ...doc.toObject(),
        id: doc._id,
      }
    })
  }

  res.status(200).send({ success: true, tree: resultTree })
})

//To be Discarded when new Version of Frontend will be up
const updateStructure = asyncHandler(async (req, res, next) => {
  req.body.treeData.forEach(async (node) => {
    let struct = await Structure.findOne({ _id: node.id, user: req.user.id })

    if (!struct) {
      return next(
        new ErrorResponse(`No Structure with the id of ${node.id}`, 404),
      )
    }

    struct.text = node.text
    struct.parent = node.parent

    await struct.save()
  })

  res.status(200).json({
    success: true,
  })
})

//Done
const updateSystemStructure = asyncHandler(async (req, res, next) => {
  req.body.treeData.forEach(async (node) => {
    let struct = await Structure.findOne({ _id: node.id })

    if (!struct) {
      return next(
        new ErrorResponse(`No Structure with the id of ${node.id}`, 404),
      )
    }

    struct.text = node.text
    struct.parent = node.parent

    await struct.save()
  })

  res.status(200).json({
    success: true,
  })
})

// Done
const updateStructText = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const { title: value } = req.body

  let struct = await Structure.findOne({ _id: id, user: req.user.id })

  if (!struct) {
    return next(new ErrorResponse(`No Structure with the id of ${id}`, 404))
  }

  struct.text = value

  await struct.save()

  res.status(200).json({
    success: true,
  })
})

// Done
const updateSystemStructText = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const { title: value } = req.body

  let struct = await Structure.findOne({ _id: id })

  if (!struct) {
    return next(new ErrorResponse(`No Structure with the id of ${id}`, 404))
  }

  struct.text = value

  await struct.save()

  res.status(200).json({
    success: true,
  })
})

// Done
const addNewChat = asyncHandler(async (req, res, next) => {
  // res
  // .status(200)
  // .send({ result: historyStructureCreate, id: historyStructureCreate._id });

  // const rootHistoryFolder = await Structure.findOne({
  //   parent: 0,
  //   user: req.user.id,
  //   category: 'History',
  // })

  const fileCreate = await Structure.create({
    user: req.user.id,
    parent: 0,
    droppable: false,
    text: 'New Chat',
    type: 'File',
    category: 'History',
  })

  // appebd id as well same as _i

  let file = fileCreate.toObject()

  file.id = file._id

  let historyData = await Structure.find({
    user: req.user.id,
    category: 'History',
  })
  historyData = historyData.map((doc) => {
    return {
      ...doc.toObject(),
      id: doc._id,
    }
  })

  res
    .status(200)
    .send({ result: historyData, id: fileCreate._id, file: fileCreate })
})

// Done
const addNewFolder = asyncHandler(async (req, res, next) => {
  // const rootHistoryFolder = await Structure.findOne({
  //   parent: 0,
  //   user: req.user.id,
  //   category: 'History',
  // })

  const folderCreate = await Structure.create({
    user: req.user.id,
    parent: 0,
    droppable: true,
    text: 'New Folder',
    type: 'Folder',
    category: 'History',
  })

  // appebd id as well same as _id

  let folder = folderCreate.toObject()

  folder.id = folder._id

  let historyData = await Structure.find({
    user: req.user.id,
    category: 'History',
  })
  historyData = historyData.map((doc) => {
    return {
      ...doc.toObject(),
      id: doc._id,
    }
  })

  res
    .status(200)
    .send({ result: historyData, id: folderCreate._id, folder: folderCreate })
})

function isEmpty(obj) {
  return Object.keys(obj).length === 0
}

const getHistoryById = asyncHandler(async (req, res, next) => {
  const { id } = req.body

  const history = await History.find({
    structure: id,
    user: req.user.id,
  }).sort({ createdAt: 1 })

  if (!history) {
    return next(new ErrorResponse(`No History with the id of ${id}`, 404))
  }

  res.status(200).json({
    success: true,
    result: history,
  })
})

const getSharedHistoryById = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  console.log("IDDDDD",id)

  const structure = await Structure.find({
    _id: id,
    isShared: true,
    category: 'History',
  })
  console.log('Structure:', structure)
  if (structure.length > 0) {
    const history = await History.find({
      structure: id,
      // user: req.user.id,
    }).sort({ createdAt: 1 })

    if (!history) {
      return next(new ErrorResponse(`No History with the id of ${id}`, 404))
    }

    res.status(200).json({
      success: true,
      result: history,
    })
  }
  res.status(404).json({
    success: false,
    result: [],
  })
})

const checkSharedHistoryById = asyncHandler(async (req, res, next) => {
  const { id } = req.body

  const structure = await Structure.findById(id)
  if (structure) {
    console.log('INSIDE')

    return res.status(200).json({
      success: true,
      result: structure,
    })
  }
  console.log('OUTSIDE')
  return res.status(404).json({
    success: false,
    result: [],
  })
})

const changeSharedHistoryById = asyncHandler(async (req, res, next) => {
  const { id, isShared } = req.body

  const structure = await Structure.findById(id)
  if (structure) {
    structure.isShared = isShared
    await structure.save()

    res.status(200).json({
      success: true,
      result: structure,
    })
  }
  res.status(404).json({
    success: false,
    result: [],
  })
})

// Done

const addNewPromptFolder = asyncHandler(async (req, res, next) => {
  try {
    const rootPromptFolder = await Structure.findOne({
      parent: 0,
      user: req.user.id,
      category: 'Prompt',
    })

    const folderCreate = await Structure.create({
      user: req.user.id,
      parent: rootPromptFolder._id,
      droppable: true,
      text: 'New Folder',
      type: 'Folder',
      category: 'Prompt',
    })

    // Retrieve all prompt data for the user
    let promptData = await Structure.find({
      user: req.user.id, // User ID
      category: 'Prompt', // Filter by category "Prompt"
    })

    // Map the retrieved data to a new format
    promptData = promptData.map((doc) => {
      return {
        ...doc.toObject(),
        id: doc._id, // Use _id as id for consistency
      }
    })

    res.status(200).json({ result: promptData, id: folderCreate._id })
  } catch (err) {
    next(err)
  }
})

const addNewSystemPromptFolder = asyncHandler(async (req, res, next) => {
  try {
    const rootPromptFolder = await Structure.findOne({
      parent: 0,

      category: 'System',
    })

    const folderCreate = await Structure.create({
      parent: rootPromptFolder._id,
      droppable: true,
      text: 'New Folder',
      type: 'Folder',
      category: 'System',
    })

    let systemData = await Structure.find({ category: 'System' })

    systemData = systemData.map((doc) => {
      return {
        ...doc.toObject(),
        id: doc._id,
      }
    })

    res.status(200).json({ result: systemData, id: folderCreate._id })
  } catch (err) {
    next(err)
  }
})

// Done

const addNewPrompt = asyncHandler(async (req, res, next) => {
  const { name, description, content } = req.body

  const rootPromptFolder = await Structure.findOne({
    parent: 0,
    user: req.user.id,
    category: 'Prompt',
  })

  const structureCreate = await Structure.create({
    user: req.user.id,
    parent: rootPromptFolder._id,
    droppable: false,
    text: name,
    type: 'File',
    category: 'Prompt',
  })

  await Prompt.create({
    user: req.user.id,
    structure: rootPromptFolder._id,
    name: name,
    description: description,
    content: content,
    promptFile: structureCreate._id,
  })

  let promptData = await Structure.find({
    user: req.user.id, // User ID
    category: 'Prompt', // Filter by category "Prompt"
  })

  // Map the retrieved data to a new format
  promptData = promptData.map((doc) => {
    return {
      ...doc.toObject(),
      id: doc._id, // Use _id as id for consistency
    }
  })

  res.status(200).json({
    result: promptData,
    id: structureCreate._id,
  })
})

const addUltimateNewPrompt = async (req, res, next) => {
  try {
    const { name, description, content } = req.body

    const rootPromptFolder = await Structure.findOne({
      parent: 0,

      category: 'System',
    })

    const structureCreate = await Structure.create({
      parent: rootPromptFolder._id,
      droppable: false,
      text: name,
      type: 'File',
      category: 'System',
    })

    if (structureCreate) {
      await Prompt.create({
        structure: rootPromptFolder._id,
        name: name,
        description: description,
        content: content,
        promptFile: structureCreate._id,
      })

      let systemData = await Structure.find({ category: 'System' })

      systemData = systemData.map((doc) => {
        return {
          ...doc.toObject(),
          id: doc._id,
        }
      })

      res.status(200).json({
        result: systemData,
        id: structureCreate._id,
      })
    }
  } catch (error) {
    next(error)
  }
}

const getPromptById = asyncHandler(async (req, res, next) => {
  const { id } = req.body

  if (req.user.proAccount == false) {
    return res.status(500).json({ message: 'Please Upgrade to Pro to use it' })
  }

  const prompt = await Prompt.findOne({
    promptFile: id,
    user: req.user.id,
  })

  if (!prompt) {
    return next(new ErrorResponse(`No Prompt with the id of ${id}`, 404))
  }

  res.status(200).json({
    success: true,
    result: prompt,
  })
})

const getUltimatePromptById = async (req, res, next) => {
  try {
    const { id } = req.body

    const prompt = await Prompt.findOne({ promptFile: id })

    console.log('Prompt', prompt)

    if (!prompt) {
      return next(new ErrorResponse(`No Prompt with the id of ${id}`, 404))
    }

    res.status(200).json({
      success: true,
      result: prompt,
    })
  } catch (error) {}
}

const getSystemPromptsTree = asyncHandler(async (req, res, next) => {
  //   const rootPromptFolder = await Structure.findOne({ parent: 0,  category: 'System' });

  // check if root folder exists

  let promptData = await Structure.find({ category: 'System' })

  promptData = promptData.map((doc) => {
    return {
      ...doc.toObject(),
      id: doc._id,
    }
  })

  res.status(200).send({ result: promptData })
})

const deletesystemprompt = async (req, res, next) => {
  const historystructure = await Structure.deleteMany({ category: 'System' })

  return res.json({ message: 'DELETED' })
}

const saveprompt = asyncHandler(async (req, res, next) => {
  const { id, email, name, description } = req.body

  const promptfind = await Prompt.findOne({ promptFile: id })
  console.log('prompt id', id)
  if (promptfind) {
    promptfind.email = email
    promptfind.name = name
    promptfind.description = description

    const promptsave = await promptfind.save()

    const structurefind = await Structure.findById(promptfind.promptFile)

    structurefind.text = name

    await structurefind.save()

    let promptData = await Structure.find({
      user: req.user.id, // User ID
      category: 'Prompt', // Filter by category "Prompt"
    })

    // Map the retrieved data to a new format
    promptData = promptData.map((doc) => {
      return {
        ...doc.toObject(),
        id: doc._id, // Use _id as id for consistency
      }
    })
    res.status(200).json({
      result: promptData,
    })
  }

  res.status(500).json({ status: false })
})

const saveultimateprompt = asyncHandler(async (req, res, next) => {
  const { id, email, name, description, content } = req.body

  const promptfind = await Prompt.findOne({ promptFile: id })
  console.log('prompt id', id)
  if (promptfind) {
    promptfind.email = email
    promptfind.name = name
    promptfind.description = description
    promptfind.content = content

    const promptsave = await promptfind.save()

    const structurefind = await Structure.findById(promptfind.promptFile)

    structurefind.text = name

    await structurefind.save()

    let promptData = await Structure.find({
      // User ID
      category: 'System', // Filter by category "Prompt"
    })

    // Map the retrieved data to a new format
    promptData = promptData.map((doc) => {
      return {
        ...doc.toObject(),
        id: doc._id, // Use _id as id for consistency
      }
    })
    return res.status(200).json({
      result: promptData,
    })
  }

  return res.status(500).json({ status: false })
})

const promptsearch = asyncHandler(async (req, res, next) => {
  // try {
  //   // Get the search content from the request body
  //   const { content } = req.body;

  //   // Check if the content is provided
  //   if (!content) {
  //     return res.status(400).json({ message: "Content to search is required" });
  //   }

  //   // Search in Structure model
  //   const structureMatches = await Structure.find({
  //     text: { $regex: content, $options: 'i' } // Case-insensitive search
  //   }, 'text _id');

  //   // Search in Prompt model for any related structures
  //   const promptMatches = await Prompt.find({
  //     $or: [
  //       { name: { $regex: content, $options: 'i' } },
  //       { description: { $regex: content, $options: 'i' } },
  //       { content: { $regex: content, $options: 'i' } }
  //     ]
  //   }).select('structure').distinct('structure');

  //   // Combine IDs from both matches
  //   const combinedIds = [...new Set([...structureMatches.map(s => s._id.toString()), ...promptMatches])];

  //   // Find structures with combined IDs
  //   const results = await Structure.find({
  //     '_id': { $in: combinedIds }
  //   }, 'text _id');

  //   // Send the results
  //   res.status(200).json(results);
  // } catch (error) {
  //   // Handle any errors that occur during the process
  //   res.status(500).json({ message: "Error searching content", error: error });
  // }

  // try {
  //   // Get the search content from the request body
  //   const { content } = req.body;

  //   // Check if the content is provided
  //   if (!content) {
  //     return res.status(400).json({ message: "Content to search is required" });
  //   }

  //   // Search in Prompt model and populate the 'structure' field
  //   const prompts = await Prompt.find({
  //     $or: [
  //       { name: { $regex: content, $options: 'i' } },
  //       { description: { $regex: content, $options: 'i' } },
  //       { content: { $regex: content, $options: 'i' } }
  //     ]
  //   }).populate('structure');

  //   // Extract Structure IDs where a match is found in the populated Structure text field
  //   const structureIdsFromPrompt = prompts
  //     .filter(prompt => prompt.structure && new RegExp(content, 'i').test(prompt.structure.text))
  //     .map(prompt => prompt.structure._id);

  //   // Search directly in Structure model
  //   const directStructureMatches = await Structure.find({
  //     text: { $regex: content, $options: 'i' } // Case-insensitive search
  //   }, '_id');

  //   // Combine and deduplicate IDs
  //   const combinedIds = [...new Set([...structureIdsFromPrompt, ...directStructureMatches.map(s => s._id)])];

  //   // Find and return the Structures with these IDs, selecting only text and ID
  //   const results = await Structure.find({
  //     '_id': { $in: combinedIds }
  //   }, 'text _id');

  //   res.status(200).json(results);
  // } catch (error) {
  //   // Handle any errors that occur during the process
  //   res.status(500).json({ message: "Error searching content", error: error });
  // }

  try {
    // Get the search content from the request body
    const { content } = req.body

    // Check if the content is provided
    if (!content) {
      return res.status(400).json({ message: 'Content to search is required' })
    }

    // Create a case-insensitive regex for content
    //  const contentRegex = new RegExp(content, 'i');
    const contentRegex = new RegExp('.*' + content + '.*')
    console.log('contentRegex', contentRegex)

    // Search in Prompt model and populate the 'structure' field
    // const promptMatches = await Prompt.find({
    //   $or: [
    //     { name: contentRegex },
    //     { description: contentRegex },
    //     { content: contentRegex },
    //     { 'structure.text': contentRegex }
    //   ]
    // }).populate({
    //   path: 'structure',
    //   match: { type: 'File' } // Only populate if the structure type is 'File'
    // });

    const promptMatches = await Prompt.find({
      $or: [
        { name: { $regex: contentRegex, $options: 'i' } },
        { description: { $regex: contentRegex, $options: 'i' } },
        { content: { $regex: content, $options: 'i' } },
        // { 'structure.text': { $regex: contentRegex, $options: 'i' } }
      ],
    }).populate({
      path: 'promptFile',
      // match: { type: 'File' }
    })
    // console.log('promptMatches', promptMatches)

    // Filter out prompts where the structure wasn't populated (didn't match 'File' type)
    const filteredPrompts = promptMatches.filter(
      (prompt) =>
        prompt.promptFile &&
        (prompt.promptFile.category !== 'Prompt' ||
          prompt.promptFile.user.toString() === req.user._id.toString()),
    )

    // If matches are found in Prompts, return these
    if (filteredPrompts.length > 0) {
      const results = filteredPrompts.map((prompt) => ({
        _id: prompt.promptFile._id,
        text: prompt.promptFile.text,
      }))

      return res.status(200).json(results)
    }

    // If no matches in Prompts, search in Structure model for 'File' type
    const structureMatches = await Structure.find(
      {
        type: 'File',
        text: contentRegex,
      },
      'text _id',
    )

    // Return Structure matches
    res.status(200).json(structureMatches)
  } catch (error) {
    // Handle any errors that occur during the process
    res.status(500).json({ message: 'Error searching content', error: error })
  }
})

const chatsearch = asyncHandler(async (req, res, next) => {
  try {
    const userId = req.user.id // Assuming the JWT contains the user ID
    const { content } = req.body

    // Query to find history entries with content containing the provided string, populate structure
    // and filter by structure category 'history'
    const histories = await History.find({
      user: userId,
      content: new RegExp(content, 'i'), // Case-insensitive search
      role: 'user',
    }).populate({
      path: 'structure',
      match: { category: 'History' }, // Filter to match structures with category 'history'
    })

    // Filter out histories without a matched structure and create a set of unique structure IDs
    const uniqueStructures = new Set()
    const structuresWithText = histories.reduce((acc, history) => {
      if (
        history.structure &&
        !uniqueStructures.has(history.structure._id.toString())
      ) {
        uniqueStructures.add(history.structure._id.toString())
        acc.push({
          structureId: history.structure._id.toString(),
          textContent: history.structure.text,
          category: history.structure.category,
        })
      }
      return acc
    }, [])

    res.status(200).json({ structuresWithText })
  } catch (error) {
    res.status(500).json({
      message: 'Error retrieving unique structures and text',
      error: error.message,
    })
  }
})

function validateImageUrl(url) {
  // This regex matches URLs that are from the blob.core.windows.net domain
  const allowedDomainRegex =
    /^https:\/\/[a-zA-Z0-9]+\.blob\.core\.windows\.net\//
  return allowedDomainRegex.test(url)
}

module.exports = {
  getReponse,
  getClaudeResponse,
  generateImage,
  downloadImage,
  getHistoryTreeData,

  getPromptTreeData,

  addNewChat,
  addNewFolder,
  getHistoryById,
  addNewPromptFolder,
  addNewPrompt,
  getPromptById,

  getSystemPromptsTree,
  addUltimateNewPrompt,

  getUltimatePromptById,

  deletesystemprompt,

  deleteStructure,
  updateStructure,
  updateStructureNew,
  updateStructText,
  updateSystemStructText,
  updateSystemStructure,
  deleteSystemStructure,
  getSystemTreeData,
  addNewSystemPromptFolder,
  saveprompt,
  saveultimateprompt,
  promptsearch,
  chatsearch,
  getSharedHistoryById,
  checkSharedHistoryById,
  changeSharedHistoryById,
}
