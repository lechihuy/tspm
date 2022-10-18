# Yêu cầu
* Node v18

# Cài đặt
```
npm install
```

# Cách sử dụng
1. Mở file data.xlsx lên và nhập thông tin Task, Duration, Predecessors

> **Lưu ý**
>
> Predecessors chứa số thứ tự tương ứng của hàng và ngăn cách nhau bởi dấu phẩy. Ví dụ: 7,9,10

2. Chạy terminal lệnh `node index`
3. Sau khi chạy xong
* File data.xlsx sẽ được cập nhật
* Truy cập http://localhost:3000 để xem PERT chart