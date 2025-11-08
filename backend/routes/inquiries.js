const express = require('express');
const nodemailer = require('nodemailer');
const Inquiry = require('../models/Inquiry');
const Property = require('../models/Property');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Create inquiry
router.post('/', async (req, res) => {
  try {
    const inquiry = new Inquiry(req.body);
    await inquiry.save();

    // Send email notification
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS // Use App Password if 2FA is enabled
      }
    });

    const property = await Property.findOne({ id: req.body.propertyId });
    if (!property) {
      console.error('Property not found for inquiry');
      return res.status(400).json({ message: 'Property not found' });
    }
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: process.env.ADMIN_EMAIL,
      subject: 'New Property Inquiry',
      text: `New inquiry for property: ${property.title}\nName: ${req.body.name}\nEmail: ${req.body.email}\nMessage: ${req.body.message}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Error sending email to admin:', error);
      } else {
        console.log('Email sent to admin:', info.response);
      }
    });

    // Send confirmation email to the user
    const userMailOptions = {
      from: process.env.EMAIL_USER,
      to: req.body.email,
      subject: 'Inquiry Submitted Successfully',
      text: `Thank you for your inquiry regarding the property: ${property.title}.\n\nYour message: ${req.body.message}\n\nWe will get back to you soon.`
    };

    transporter.sendMail(userMailOptions, (error, info) => {
      if (error) {
        console.error('Error sending confirmation email to user:', error);
      } else {
        console.log('Confirmation email sent to user:', info.response);
      }
    });

    res.status(201).json(inquiry);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get inquiries (admin only)
router.get('/', authenticateToken, async (req, res) => {
  // Check if user is admin
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  try {
    const inquiries = await Inquiry.find().populate({
      path: 'propertyId',
      model: Property,
      match: { id: '$propertyId' }
    }).populate('userId');
    res.json(inquiries);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
