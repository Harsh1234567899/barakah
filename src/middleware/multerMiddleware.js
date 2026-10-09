const multer = require('multer') 
const storage = multer.diskStorage({
  destination: function (req, file, cb) { 
    cb(null, "./public") // multer store file in this for some time 
  },
  filename: function (req, file, cb) {
    // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9) // logic to change file name
    // callback(null, file.fieldname + '-' + uniqueSuffix)
    cb(null, file.originalname)
  }
})
  
const upload = multer({ storage: storage })
module.exports = { upload }