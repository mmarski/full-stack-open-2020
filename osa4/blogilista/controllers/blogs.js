const blogsRouter = require('express').Router()
const jwt = require('jsonwebtoken')
const Blog = require('../models/blog')
const User = require('../models/user')

// Authorization token
/*function getTokenFrom(request) {
  const authorization = request.get('authorization')
  if (authorization && authorization.toLowerCase().startsWith('bearer ')) {
    return authorization.substring(7)
  }
  return null
}*/

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog
    .find({}).populate('user', { username: 1, name: 1 })

  response.json(blogs)
})

blogsRouter.get('/:id', async (request, response) => {

  const blog = await Blog.findById(request.params.id)
    .populate('user', { username: 1, name: 1 })
  response.json(blog)
})

blogsRouter.post('/', async (request, response) => {
  const body = request.body
  const token = request.token

  const decodedToken = jwt.verify(token, process.env.SECRET)
  if (!token || !decodedToken.id) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }
  const user = await User.findById(decodedToken.id)

  if (!user) {
    return response.status(500).send({ error: 'user was not found' })
  }

  const blog = new Blog({
    title: body.title,
    url: body.url,
    author: body.author,
    likes: body.likes,
    user: user._id
  })

  const savedBlog = await blog.save()
  user.blogs = user.blogs.concat(savedBlog._id)
  await user.save()
  await savedBlog.populate('user', { username: 1, name: 1 }).execPopulate()
  response.status(201).json(savedBlog)
})

blogsRouter.delete('/:id', async (request, response) => {
  const token = request.token

  const decodedToken = jwt.verify(token, process.env.SECRET)

  if (!token || !decodedToken.id) {
    return response.status(401).json({ error: 'token missing or invalid' })
  }
  const user = await User.findById(decodedToken.id)

  if (!user) {
    return response.status(500).send({ error: 'user was not found' })
  }

  const blogToBeDeleted = await Blog.findById(request.params.id)
  if (!blogToBeDeleted) {
    return response.status(404).end()
  }

  if (user.id.toString() !== blogToBeDeleted.user.toString()) {
    return response.status(401).send({ error: 'unauthorized user' })
  }

  const deleted = await Blog.findByIdAndRemove(request.params.id)

  if(deleted) {
    response.status(204).end()
  } else {
    response.status(404).end()
  }
})

blogsRouter.put('/:id', async (request, response) => {
  const body = request.body

  const blog = {
    likes: body.likes
  }

  const updated = await Blog.findByIdAndUpdate(request.params.id, blog, { new: true })

  if(updated) {
    await updated.populate('user', { username: 1, name: 1 }).execPopulate()
    response.json(updated)
  } else {
    response.status(404).end()
  }
})

module.exports = blogsRouter