import pool from '../db/pool.js';

export const saveProfessionalInfo = async (req, res) => {
  console.log('🚀 Starting saveProfessionalInfo...');
  console.log('Request body:', req.body);
  console.log('Request files:', req.files ? req.files.length : 'No files');
  
  try {
    // Try to get counselorId from authentication first, fallback to email-based lookup
    let counselorId = null;
    let userEmail = '';
    
    if (req.user && req.user.counselorId) {
      // Authenticated user
      counselorId = req.user.counselorId;
      console.log('✅ Using authenticated counselor ID:', counselorId);
    } 
    
    const {
      email,
      therapistId,
      specialization,
      experience,
      educationBackground,
      additionalCertifications,
      targetConditions,
      therapeuticApproach,
      nationalIdNumber
    } = req.body;

    console.log('📝 Extracted form data:', {
      email, therapistId, specialization, experience, educationBackground,
      additionalCertifications, targetConditions, therapeuticApproach, nationalIdNumber
    });

    // If no authentication, try to find user by email (for post-email confirmation flow)
    if (!counselorId && email) {
      console.log('🔍 Looking up user by email:', email);
      const userResult = await pool.query(
        'SELECT id, email_confirmed FROM counselors WHERE email = $1',
        [email]
      );
      
      if (userResult.rows.length === 0) {
        console.log('❌ User not found for email:', email);
        return res.status(404).json({ error: 'Account not found for this email' });
      }
      
      if (!userResult.rows[0].email_confirmed) {
        console.log('❌ Email not confirmed for:', email);
        return res.status(400).json({ error: 'Email must be confirmed before saving professional information' });
      }
      
      counselorId = userResult.rows[0].id;
      userEmail = email;
      console.log('✅ Found counselor ID:', counselorId);
    } else if (!counselorId) {
      console.log('❌ No counselor ID and no email provided');
      return res.status(400).json({ error: 'Please provide email address for verification' });
    }

    // Process uploaded files and save as BLOBs
    const savedDocuments = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        try {
          // File data is already in memory as buffer
          const fileBuffer = file.buffer;
          
          // Determine document type based on fieldname
          let documentType = 'other';
          if (file.fieldname.includes('educationDocs')) {
            documentType = 'education';
          } else if (file.fieldname.includes('professionalDocs')) {
            documentType = 'professional';
          } else if (file.fieldname.includes('nationalId')) {
            documentType = 'national_id';
          }
          
          // Save to documents table as BLOB
          const docResult = await pool.query(
            `INSERT INTO documents (counselor_id, document_type, original_filename, file_data, mime_type, file_size)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, document_type, original_filename, file_size`,
            [counselorId, documentType, file.originalname, fileBuffer, file.mimetype, file.size]
          );
          
          savedDocuments.push(docResult.rows[0]);
          
        } catch (error) {
          console.error('Error saving document:', error);
        }
      }
    }

    console.log('Saving professional info for counselor:', counselorId);
    console.log('Professional info data:', {
      therapistId, specialization, experience, educationBackground, 
      additionalCertifications, targetConditions, therapeuticApproach, 
      nationalIdNumber, filesCount: savedDocuments.length
    });

    // Update the counselor with professional information
    console.log('🔄 Updating counselor with professional info...');
    console.log('📊 Update parameters:', {
      counselorId, therapistId, specialization, experience, educationBackground,
      additionalCertifications, targetConditions, therapeuticApproach, nationalIdNumber
    });
    
    let result;
    try {
      result = await pool.query(
        `UPDATE counselors 
         SET therapist_id = $1,
             specialization = $2,
             experience = $3,
             education_background = $4,
             additional_certifications = $5,
             target_conditions = $6,
             therapeutic_approach = $7,
             national_id_number = $8,
             verification_status = 'pending',
             updated_at = NOW()
         WHERE id = $9
         RETURNING id, name, email, therapist_id, specialization, experience, 
                   education_background, additional_certifications, target_conditions, 
                   therapeutic_approach, national_id_number, verification_status`,
        [therapistId, specialization, experience, educationBackground, 
         additionalCertifications, targetConditions, therapeuticApproach, nationalIdNumber, counselorId]
      );
      
      console.log('✅ Database update successful!');
      console.log('📋 Updated counselor data:', result.rows[0]);
      
    } catch (dbError) {
      console.error('❌ Database error:', dbError);
      return res.status(500).json({ 
        error: 'Database error while saving professional information',
        details: dbError.message
      });
    }

    console.log('📋 Final counselor data:', result.rows[0]);
    console.log('📁 Saved documents:', savedDocuments);

    if (result.rows.length === 0) {
      console.log('❌ No counselor found after update');
      return res.status(404).json({ error: 'Counselor not found' });
    }

    console.log('🎉 Sending success response...');
    
    // Verify the data was actually saved
    try {
      const verifyResult = await pool.query(
        'SELECT therapist_id, specialization, experience, education_background, national_id_number, verification_status FROM counselors WHERE id = $1',
        [counselorId]
      );
      console.log('🔍 Verification query result:', verifyResult.rows[0]);
    } catch (verifyError) {
      console.error('❌ Verification query failed:', verifyError);
    }
    
    res.json({
      success: true,
      message: 'Professional information saved successfully',
      counselor: result.rows[0],
      uploadedDocuments: savedDocuments
    });

  } catch (error) {
    console.error('Error saving professional information:', error);
    res.status(500).json({ 
      error: 'Failed to save professional information',
      details: 'Please try again or contact support'
    });
  }
};
