const ErrorResponse = require('../utils/errorResponse')
const asyncHandler = require('../middleware/async')

const Structure = require('../models/Structure')
const Prompt = require('../models/Prompt')

exports.getUltimatePromptsAllFoldersandFiles = asyncHandler(
  async (req, res, next) => {
    const rootFolder = await Structure.findOne({
      category: 'System',
      type: 'Folder',
      parent: 0,
    })

    const promptData = await Structure.find({
      category: 'System',
      parent: rootFolder._id.toString(),
    }).sort({ createdAt: -1 })

    return res.status(200).json({
      result: promptData,
    })
  },
)

exports.getUltimateStructContent = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  console.log(id)
  const promptData = await Structure.find({
    category: 'System',
    parent: id.toString(),
  }).sort({ createdAt: -1 })

  return res.status(200).json({
    result: promptData,
  })
})

exports.addUltimatePromptFolder = asyncHandler(async (req, res, next) => {
  const { name, parent } = req.body
  console.log(req.body)
  // if parent is null then set it to root folder
  parentId = parent
  if (!parent) {
    const rootFolder = await Structure.findOne({
      category: 'System',
      type: 'Folder',
      parent: 0,
    })
    parentId = rootFolder._id.toString()
  }
  const promptData = await Structure.create({
    text: name,
    parent: parentId,
    category: 'System',
    type: 'Folder',
  })

  return res.status(200).json({
    result: promptData,
  })
})

exports.deleteUltimatePromptFolder = asyncHandler(async (req, res, next) => {
  const { id } = req.params
  const promptData = await Structure.deleteOne({
    _id: id,
  })

  // Delete all child folders

  const childFolders = await Structure.find({
    parent: id,
  })

  const prompts = await Prompt.find({
    parent: id,
  })

  prompts.forEach(async (prompt) => {
    await Prompt.deleteOne({
      _id: prompt._id,
    })
  })

  childFolders.forEach(async (folder) => {
    await Structure.deleteOne({
      _id: folder._id,
    })

    await Prompt.deleteMany({
      parent: folder._id,
    })
  })

  return res.status(200).json({
    success: true,
  })
})

exports.addUltimateNewPrompt = async (req, res, next) => {
  try {
    const { name, description, content, parent } = req.body

    console.log(req.body)

    let parentId = parent

    if (!parent) {
      const rootFolder = await Structure.findOne({
        category: 'System',
        type: 'Folder',
        parent: 0,
      })
      parentId = rootFolder._id.toString()
    }

    const structureCreate = await Structure.create({
      parent: parentId,
      droppable: false,
      text: name,
      type: 'File',
      category: 'System',
    })

    if (structureCreate) {
      await Prompt.create({
        structure: parentId,
        name: name,
        description: description,
        content: content,
        promptFile: structureCreate._id,
      })

      let systemData = await Structure.find({ category: 'System' })

      res.status(200).json({
        result: structureCreate,
      })
    }
  } catch (error) {
    next(error)
  }
}

exports.getUltimatePromptById = async (req, res, next) => {
  try {
    const { id } = req.params

    // const prompt = await Prompt.findOne({ promptFile: id })
    const prompt = await Prompt.find({ promptFile: id })

    if (!prompt) {
      return next(new ErrorResponse(`No Prompt with the id of ${id}`, 404))
    }

    res.status(200).json({
      success: true,
      result: prompt,
    })
  } catch (error) {}
}

exports.editultimateprompt = asyncHandler(async (req, res, next) => {
  const { email, name, description, content } = req.body
  const { id } = req.params

  const promptfind = await Prompt.findOne({ promptFile: id })
  console.log('prompt id', id)
  if (promptfind) {
    promptfind.email = email
    promptfind.name = name
    promptfind.description = description
    promptfind.content = content

    const promptsave = await promptfind.save()

    const structurefind = await Structure.findById(promptfind.promptFile)

    console.log('structure id', structurefind)

    structurefind.text = name

    await structurefind.save()

    let promptData = await Structure.find({
      // User ID
      category: 'System', // Filter by category "Prompt"
    })

    return res.status(200).json({
      result: promptData,
    })
  }

  return res.status(500).json({ status: false })
})
