const {Router} = require('express')
const router = Router()


const userRouter = require('./user-router')
const postsRouter = require('./post-router')
const commentsRouter = require('./comments-router')
const followRouter = require('./follow-router')
const likeRouter = require('./like-router')

router.use('/user', userRouter)
router.use('/posts', postsRouter)
router.use('/comments', commentsRouter)
router.use('/follows', followRouter)
router.use('/likes', likeRouter)


module.exports = router