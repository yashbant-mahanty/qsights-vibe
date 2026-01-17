/**
 * Default Email Templates with Activity Links
 * These templates include proper HTML structure with clickable "View Activity Details" buttons
 */

export interface EmailTemplateData {
  activity_name: string;
  activity_link: string;
  participant_name?: string;
  program_name?: string;
  organization_name?: string;
  end_date?: string;
  start_date?: string;
}

export const DEFAULT_EMAIL_TEMPLATES = {
  invitation: {
    subject: "You're Invited: {{activity_name}}",
    body_html: `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🎉 You're Invited!</h1>
  </div>
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 10px;">Hello <strong>{{participant_name}}</strong>,</p>
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">You have been invited to participate in: <strong>{{activity_name}}</strong></p>
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 30px;">Please click the button below to access the activity:</p>
    <div style="text-align: center; margin: 30px 0;"><a href="{{activity_link}}" style="display: inline-block; padding: 14px 40px; background-color: #6366f1; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">View Activity Details</a></div>
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin-top: 30px;">If you have any questions, please don't hesitate to reach out.</p>
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;"><p style="font-size: 12px; color: #9ca3af; margin: 0;">This activity is valid until <strong>{{end_date}}</strong>. If you have any questions, please contact the administrator.</p></div>
  </div>
</div>`,
    body_text: `Hello {{participant_name}},

You have been invited to participate in: {{activity_name}}

Please visit the following link to access the activity:
{{activity_link}}

This activity is valid until {{end_date}}. If you have any questions, please contact the administrator.`,
  },

  reminder: {
    subject: "Reminder: {{activity_name}}",
    body_html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🔔 Reminder</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 10px;">
      Hello <strong>{{participant_name}}</strong>,
    </p>
    
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
      This is a friendly reminder to complete: <strong>{{activity_name}}</strong>
    </p>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 30px;">
      You haven't completed this activity yet. Please click the button below to continue:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{activity_link}}" 
         style="display: inline-block; padding: 14px 40px; background-color: #f59e0b; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Continue Activity
      </a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        This activity will close on <strong>{{end_date}}</strong>.
      </p>
    </div>
  </div>
</div>
    `.trim(),
    body_text: `Hello {{participant_name}},

This is a reminder to complete: {{activity_name}}

You haven't completed this activity yet. Please visit the following link to continue:
{{activity_link}}

This activity will close on {{end_date}}.`,
  },

  "thank-you": {
    subject: "Thank You for Participating",
    body_html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">✨ Thank You!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 10px;">
      Hello <strong>{{participant_name}}</strong>,
    </p>
    
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
      Thank you for completing: <strong>{{activity_name}}</strong>
    </p>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 30px;">
      We appreciate your time and feedback. Your response has been recorded successfully.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{activity_link}}" 
         style="display: inline-block; padding: 14px 40px; background-color: #10b981; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Activity Details
      </a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        If you have any questions about your submission, please contact the administrator.
      </p>
    </div>
  </div>
</div>
    `.trim(),
    body_text: `Hello {{participant_name}},

Thank you for completing: {{activity_name}}

We appreciate your time and feedback. Your response has been recorded successfully.

View activity details: {{activity_link}}

If you have any questions about your submission, please contact the administrator.`,
  },

  "program-expiry": {
    subject: "Program Closing Soon: {{activity_name}}",
    body_html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">⏰ Program Closing Soon</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 10px;">
      Hello <strong>{{participant_name}}</strong>,
    </p>
    
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
      The program containing <strong>{{activity_name}}</strong> is closing soon.
    </p>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 30px;">
      This is your final reminder to complete any pending activities before the program expires on <strong>{{end_date}}</strong>.
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{activity_link}}" 
         style="display: inline-block; padding: 14px 40px; background-color: #ef4444; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Activity
      </a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        After this date, you will no longer be able to access this activity.
      </p>
    </div>
  </div>
</div>
    `.trim(),
    body_text: `Hello {{participant_name}},

The program containing {{activity_name}} is closing soon.

This is your final reminder to complete any pending activities before the program expires on {{end_date}}.

View activity: {{activity_link}}

After this date, you will no longer be able to access this activity.`,
  },

  "activity-summary": {
    subject: "Activity Summary: {{activity_name}}",
    body_html: `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
    <h1 style="color: white; margin: 0; font-size: 28px;">📊 Activity Summary</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 10px;">
      Hello <strong>{{participant_name}}</strong>,
    </p>
    
    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-bottom: 20px;">
      Here is a summary of: <strong>{{activity_name}}</strong>
    </p>
    
    <p style="font-size: 14px; color: #6b7280; line-height: 1.6; margin-bottom: 30px;">
      The activity has concluded. Click below to view the details:
    </p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="{{activity_link}}" 
         style="display: inline-block; padding: 14px 40px; background-color: #8b5cf6; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        View Activity Details
      </a>
    </div>
    
    <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        Thank you for your participation.
      </p>
    </div>
  </div>
</div>
    `.trim(),
    body_text: `Hello {{participant_name}},

Here is a summary of: {{activity_name}}

The activity has concluded.

View activity details: {{activity_link}}

Thank you for your participation.`,
  },
};

/**
 * Replace placeholders in email template
 */
export function replacePlaceholders(
  template: string,
  data: EmailTemplateData
): string {
  let result = template;
  
  const placeholders: Record<string, string> = {
    '{{activity_name}}': data.activity_name || '',
    '{{activity_link}}': data.activity_link || '',
    '{{participant_name}}': data.participant_name || 'Participant',
    '{{program_name}}': data.program_name || '',
    '{{organization_name}}': data.organization_name || '',
    '{{end_date}}': data.end_date || 'N/A',
    '{{start_date}}': data.start_date || 'N/A',
  };

  Object.entries(placeholders).forEach(([placeholder, value]) => {
    result = result.replace(new RegExp(placeholder, 'g'), value);
  });

  return result;
}

/**
 * Get default template for a notification type
 */
export function getDefaultTemplate(notificationType: string) {
  return DEFAULT_EMAIL_TEMPLATES[notificationType as keyof typeof DEFAULT_EMAIL_TEMPLATES] || null;
}

/**
 * Generate sample activity link
 */
export function generateActivityLink(activityId: string, mode: 'participant' | 'guest' = 'participant'): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/activities/take/${activityId}?mode=${mode}`;
  }
  return `http://localhost:3000/activities/take/${activityId}?mode=${mode}`;
}
