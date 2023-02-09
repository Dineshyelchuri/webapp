const userController=require('../controller/userController.js')
const router=require('express').Router()


router.post('/',userController.adduser)

router.put('/:userId',userController.updateuser)

router.get('/:userId',userController.getuser)

module.exports=router