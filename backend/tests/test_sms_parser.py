import unittest
from backend.services.sms_parser import parse_sms_or_text, parse_natural_language

class TestSmsParser(unittest.TestCase):
    def test_cmb_expense(self):
        sms = "【招商银行】您账户9527于08月25日14:30在美团消费支出人民币58.00元，余额12345.67元"
        res = parse_sms_or_text(sms)
        self.assertTrue(res["success"])
        self.assertEqual(res["amount"], 58.0)
        self.assertEqual(res["card_last4"], "9527")
        self.assertEqual(res["type"], "expense")
        self.assertIn("美团", res["merchant"])
        self.assertEqual(res["suggested_category"], "餐饮美食")
        self.assertEqual(res["balance_after"], 12345.67)

    def test_icbc_expense(self):
        sms = "【工商银行】您尾号8888卡于8月25日12:00消费支出500.00元[工银信使]"
        res = parse_sms_or_text(sms)
        self.assertTrue(res["success"])
        self.assertEqual(res["amount"], 500.0)
        self.assertEqual(res["card_last4"], "8888")
        self.assertEqual(res["type"], "expense")

    def test_ccb_transfer(self):
        sms = "【建设银行】您尾号1234的储蓄卡账户8月25日10:30向张三转账支出1000.00元，活期余额5432.10元"
        res = parse_sms_or_text(sms)
        self.assertTrue(res["success"])
        self.assertEqual(res["amount"], 1000.0)
        self.assertEqual(res["card_last4"], "1234")
        self.assertEqual(res["type"], "expense")

    def test_wechat_notification(self):
        text = "微信支付：微信支付凭证 商户消费 ¥68.50 商户名称: 瑞幸咖啡 付款方式: 招商银行储蓄卡(9527)"
        res = parse_sms_or_text(text)
        self.assertTrue(res["success"])
        self.assertEqual(res["amount"], 68.50)
        self.assertEqual(res["type"], "expense")
        self.assertEqual(res["suggested_category"], "餐饮美食")

    def test_alipay_notification(self):
        text = "支付宝：您在【淘宝天猫】通过余额宝成功付款88.00元"
        res = parse_sms_or_text(text)
        self.assertTrue(res["success"])
        self.assertEqual(res["amount"], 88.0)
        self.assertEqual(res["type"], "expense")

    def test_natural_language_one_liner(self):
        text = "昨晚海底捞吃了320招行信用卡"
        res = parse_sms_or_text(text)
        self.assertTrue(res["success"])
        self.assertEqual(res["amount"], 320.0)
        self.assertEqual(res["type"], "expense")
        self.assertEqual(res["suggested_category"], "餐饮美食")

if __name__ == "__main__":
    unittest.main()
