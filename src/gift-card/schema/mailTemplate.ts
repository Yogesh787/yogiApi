export function createMailTemplateSchema(
  recipientName: string,
  amount: number,
  code: string,
) {
  const img1 =
    'https://img.freepik.com/free-vector/gift-card-template_23-2147503047.jpg';
  const temp1 = `
<div style="background-color: #fff;border-radius: 10px;box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);max-width: 400px;padding: 20px;text-align: center;margin: auto">
  <h1>Your Gift Card Awaits!</h1>
  <p>Dear ${recipientName},</p>
  <img style="max-width: 385px;height: auto;margin-bottom: 20px;" src='${img1}' alt="Gift Card Image">
  <h1>Gift Card</h1>
  <p>You've received a gift card worth <span style="color: #4CAF50;font-size: 20px;margin-top: 10px;">$${amount}</span> to use on our platform. It's our way of saying thank you for being such a valuable part of our community.</p>
  <p>To use your gift card, simply enter the code below at checkout:</p>
  <div style="background-color: #f5f5f5;border-radius: 5px;padding: 10px;margin: 20px 0;font-size: 1.5rem;color: #333;">${code}</div>
  <p>This card is redeemable for merchandise only at participating stores.</p>
  <p>Enjoy your shopping with us!</p>
  <p>Best wishes,</p>
  <p>NxtBigByte Solutions Pvt. Ltd.</p>
<!--  todo -->
<!-- make url dymanic https://static-website-test.nbb.ai/burger-craft/menu -->
  <a href="#" style="background-color: #4CAF50;color: white;border: none;border-radius: 5px;padding: 10px 20px;text-align: center;text-decoration: none;display: inline-block;font-size: 16px;margin: 4px 2px;cursor: pointer;">Redeem Now</a>
</div>
`;
  return temp1;
}
