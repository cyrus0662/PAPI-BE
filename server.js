const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();

const connectDB = require("./config/db");

const authroute = require('./routes/authRoutes');
const productroute = require("./routes/productroute");
const orderRoute = require('./routes/orderroute');
const adminroute = require('./routes/adminroute');
const categoryRoute = require("./routes/categoryRoutes");

const app = express();

connectDB();

app.use(cors());

app.use(express.json());
app.use('/uploads', express.static('uploads'));


app.use('/api', authroute);
app.use('/api', productroute);
app.use("/api", orderRoute);
app.use('/api', adminroute);
app.use("/api", categoryRoute); 

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
