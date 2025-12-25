# Rust 学习教程：从入门到进阶

> 本教程涵盖 Rust 基础语法、核心特性到高级用法，配合丰富的代码示例

## 目录

1. [基础语法](#1-基础语法)
2. [所有权系统](#2-所有权系统)
3. [结构体与枚举](#3-结构体与枚举)
4. [模式匹配](#4-模式匹配)
5. [错误处理](#5-错误处理)
6. [泛型](#6-泛型)
7. [Trait（特征）](#7-trait特征)
8. [生命周期](#8-生命周期)
9. [闭包与迭代器](#9-闭包与迭代器)
10. [智能指针](#10-智能指针)
11. [并发编程](#11-并发编程)
12. [异步编程](#12-异步编程)
13. [宏](#13-宏)
14. [模块系统](#14-模块系统)
15. [实战项目示例](#15-实战项目示例)

---

## 1. 基础语法

### 1.1 变量与可变性

```rust
fn main() {
    // 不可变变量（默认）
    let x = 5;
    // x = 6; // 错误！不可变

    // 可变变量
    let mut y = 5;
    y = 6; // OK

    // 常量（必须标注类型，编译时求值）
    const MAX_POINTS: u32 = 100_000;

    // 变量遮蔽（Shadowing）- 可以改变类型
    let x = x + 1;
    let x = "hello"; // OK，类型从 i32 变为 &str
}
```

### 1.2 基本数据类型

```rust
fn main() {
    // 标量类型
    let integer: i32 = 42;          // 有符号整数：i8, i16, i32, i64, i128, isize
    let unsigned: u32 = 42;         // 无符号整数：u8, u16, u32, u64, u128, usize
    let float: f64 = 3.14;          // 浮点数：f32, f64
    let boolean: bool = true;       // 布尔
    let character: char = '中';     // 字符（4字节 Unicode）

    // 复合类型 - 元组
    let tuple: (i32, f64, char) = (500, 6.4, 'A');
    let (a, b, c) = tuple;          // 解构
    let first = tuple.0;            // 索引访问

    // 复合类型 - 数组（固定长度）
    let array: [i32; 5] = [1, 2, 3, 4, 5];
    let same = [3; 5];              // [3, 3, 3, 3, 3]
    let first = array[0];           // 索引访问
}
```

### 1.3 函数

```rust
// 基本函数
fn add(a: i32, b: i32) -> i32 {
    a + b  // 表达式作为返回值（无分号）
}

// 带语句和表达式
fn example() -> i32 {
    let x = 5;      // 语句（有分号）
    x + 1           // 表达式（无分号，作为返回值）
}

// 无返回值（返回单元类型 ()）
fn print_value(x: i32) {
    println!("Value: {}", x);
}

// 提前返回
fn abs(x: i32) -> i32 {
    if x < 0 {
        return -x;  // 提前返回需要 return 关键字
    }
    x
}

// 多返回值（使用元组）
fn swap(a: i32, b: i32) -> (i32, i32) {
    (b, a)
}
```

### 1.4 控制流

```rust
fn main() {
    let number = 6;

    // if 表达式
    if number % 2 == 0 {
        println!("偶数");
    } else if number % 3 == 0 {
        println!("能被3整除");
    } else {
        println!("其他");
    }

    // if 作为表达式（类似三元运算符）
    let result = if number > 5 { "大" } else { "小" };

    // loop 无限循环
    let mut counter = 0;
    let result = loop {
        counter += 1;
        if counter == 10 {
            break counter * 2;  // 带返回值的 break
        }
    };

    // while 循环
    while counter > 0 {
        counter -= 1;
    }

    // for 循环（最常用，最安全）
    let arr = [10, 20, 30];
    for element in arr {
        println!("{}", element);
    }

    // 范围迭代
    for i in 0..5 {         // 0, 1, 2, 3, 4（不包含5）
        println!("{}", i);
    }
    for i in 0..=5 {        // 0, 1, 2, 3, 4, 5（包含5）
        println!("{}", i);
    }
    for i in (1..=3).rev() { // 3, 2, 1（反向迭代）
        println!("{}", i);
    }

    // 带索引的迭代
    for (index, value) in arr.iter().enumerate() {
        println!("{}: {}", index, value);
    }
}
```

### 1.5 字符串

```rust
fn main() {
    // 字符串字面量（&str，不可变，存储在程序二进制中）
    let s1: &str = "Hello";

    // String 类型（可变，堆分配）
    let mut s2 = String::from("Hello");
    s2.push_str(", World!");  // 追加字符串
    s2.push('!');             // 追加字符

    // 字符串拼接
    let s3 = s1.to_string() + " World";  // + 运算符
    let s4 = format!("{} {}", s1, "World");  // format! 宏（推荐）

    // 字符串切片
    let hello = &s2[0..5];  // "Hello"

    // 遍历字符串
    for c in s2.chars() {
        println!("{}", c);
    }
    for b in s2.bytes() {
        println!("{}", b);
    }

    // 常用方法
    let len = s2.len();           // 字节长度
    let is_empty = s2.is_empty(); // 是否为空
    let contains = s2.contains("Hello");  // 是否包含
    let replaced = s2.replace("Hello", "Hi");  // 替换
    let trimmed = s2.trim();      // 去除首尾空白
    let parts: Vec<&str> = s2.split(',').collect();  // 分割
}
```

---

## 2. 所有权系统

> Rust 最核心的特性，保证内存安全而无需垃圾回收

### 2.1 所有权规则

```rust
fn main() {
    // 三条核心规则：
    // 1. 每个值都有一个所有者（owner）
    // 2. 同一时间只能有一个所有者
    // 3. 所有者离开作用域时，值被丢弃（drop）

    let s1 = String::from("hello");
    let s2 = s1;  // s1 的所有权移动（move）到 s2
    // println!("{}", s1);  // 错误！s1 已失效

    // 克隆（深拷贝）
    let s3 = s2.clone();
    println!("s2: {}, s3: {}", s2, s3);  // OK，两个独立的值

    // 基本类型实现了 Copy trait，赋值时复制而非移动
    let x = 5;
    let y = x;
    println!("x: {}, y: {}", x, y);  // OK，x 仍然有效
}

// 函数参数会获取所有权
fn takes_ownership(s: String) {
    println!("{}", s);
}  // s 在这里被释放（drop）

fn makes_copy(x: i32) {
    println!("{}", x);
}  // x 是 Copy 的，原值仍有效

fn main() {
    let s = String::from("hello");
    takes_ownership(s);
    // println!("{}", s);  // 错误！s 已被移动

    let x = 5;
    makes_copy(x);
    println!("{}", x);  // OK
}
```

### 2.2 引用与借用

```rust
fn main() {
    let s = String::from("hello");

    // 不可变引用（可以有多个）
    let len = calculate_length(&s);  // 借用 s
    println!("'{}' 的长度是 {}", s, len);  // s 仍然有效

    // 可变引用（同一时间只能有一个）
    let mut s = String::from("hello");
    change(&mut s);
    println!("{}", s);  // "hello, world"

    // 引用规则：
    // 1. 任意数量的不可变引用 OR 一个可变引用（二选一）
    // 2. 引用必须始终有效（无悬垂引用）

    let r1 = &s;
    let r2 = &s;     // OK：多个不可变引用
    println!("{}, {}", r1, r2);
    // r1, r2 在这之后不再使用

    let r3 = &mut s; // OK：之前的不可变引用已不再使用
    println!("{}", r3);
}

fn calculate_length(s: &String) -> usize {
    s.len()
}  // s 是引用，不会释放原值

fn change(s: &mut String) {
    s.push_str(", world");
}
```

### 2.3 切片（Slice）

```rust
fn main() {
    let s = String::from("hello world");

    // 字符串切片 &str
    let hello = &s[0..5];   // "hello"
    let world = &s[6..11];  // "world"
    let hello = &s[..5];    // 从开头开始
    let world = &s[6..];    // 到结尾
    let whole = &s[..];     // 整个字符串

    // 字符串字面量就是切片
    let literal: &str = "hello world";

    // 数组切片
    let arr = [1, 2, 3, 4, 5];
    let slice: &[i32] = &arr[1..3];  // [2, 3]

    // 获取第一个单词
    let first = first_word(&s);
    println!("第一个单词: {}", first);
}

// 推荐使用 &str 作为参数，更通用（可接受 String 和 &str）
fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();
    for (i, &byte) in bytes.iter().enumerate() {
        if byte == b' ' {
            return &s[..i];
        }
    }
    &s[..]
}
```

---

## 3. 结构体与枚举

### 3.1 结构体定义与使用

```rust
// 普通结构体
struct User {
    username: String,
    email: String,
    active: bool,
    sign_in_count: u64,
}

// 元组结构体（字段无名称）
struct Color(i32, i32, i32);
struct Point(i32, i32, i32);

// 单元结构体（无字段）
struct AlwaysEqual;

fn main() {
    // 创建实例
    let mut user1 = User {
        email: String::from("test@example.com"),
        username: String::from("test"),
        active: true,
        sign_in_count: 1,
    };

    // 访问和修改字段
    user1.email = String::from("new@example.com");

    // 结构体更新语法
    let user2 = User {
        email: String::from("another@example.com"),
        ..user1  // 其余字段从 user1 获取（注意：user1.username 被移动）
    };

    // 元组结构体
    let black = Color(0, 0, 0);
    let origin = Point(0, 0, 0);
    println!("R: {}", black.0);
}

// 字段初始化简写
fn build_user(email: String, username: String) -> User {
    User {
        email,      // 等同于 email: email
        username,   // 等同于 username: username
        active: true,
        sign_in_count: 1,
    }
}
```

### 3.2 方法与关联函数

```rust
#[derive(Debug)]  // 自动实现 Debug trait
struct Rectangle {
    width: u32,
    height: u32,
}

impl Rectangle {
    // 关联函数（类似静态方法，无 self 参数）
    fn new(width: u32, height: u32) -> Self {
        Self { width, height }
    }

    fn square(size: u32) -> Self {
        Self { width: size, height: size }
    }

    // 方法（第一个参数是 self）
    fn area(&self) -> u32 {  // &self 是 self: &Self 的简写
        self.width * self.height
    }

    fn can_hold(&self, other: &Rectangle) -> bool {
        self.width > other.width && self.height > other.height
    }

    // 可变借用 self
    fn set_width(&mut self, width: u32) {
        self.width = width;
    }

    // 获取所有权（调用后 self 被消耗）
    fn destroy(self) -> u32 {
        self.width * self.height
    }
}

// 可以有多个 impl 块
impl Rectangle {
    fn perimeter(&self) -> u32 {
        2 * (self.width + self.height)
    }
}

fn main() {
    // 使用关联函数创建实例
    let rect = Rectangle::new(30, 50);
    let square = Rectangle::square(10);

    // 调用方法
    println!("面积: {}", rect.area());
    println!("周长: {}", rect.perimeter());
    println!("调试输出: {:?}", rect);
    println!("美化输出: {:#?}", rect);
}
```

### 3.3 枚举

```rust
// 基本枚举
enum Direction {
    Up,
    Down,
    Left,
    Right,
}

// 带数据的枚举（每个变体可以有不同类型的数据）
enum Message {
    Quit,                       // 无数据
    Move { x: i32, y: i32 },   // 匿名结构体
    Write(String),              // 单个值
    ChangeColor(i32, i32, i32), // 元组
}

impl Message {
    fn call(&self) {
        match self {
            Message::Quit => println!("退出"),
            Message::Move { x, y } => println!("移动到 ({}, {})", x, y),
            Message::Write(text) => println!("写入: {}", text),
            Message::ChangeColor(r, g, b) => println!("颜色: ({}, {}, {})", r, g, b),
        }
    }
}

// Option 枚举（标准库，处理可能为空的值）
// enum Option<T> {
//     Some(T),
//     None,
// }

fn divide(a: f64, b: f64) -> Option<f64> {
    if b == 0.0 {
        None
    } else {
        Some(a / b)
    }
}

fn main() {
    let dir = Direction::Up;
    let msg = Message::Write(String::from("hello"));
    msg.call();

    // Option 使用
    let result = divide(10.0, 2.0);
    match result {
        Some(value) => println!("结果: {}", value),
        None => println!("除数不能为零"),
    }

    // if let 简化单分支匹配
    if let Some(value) = divide(10.0, 2.0) {
        println!("结果: {}", value);
    }

    // Option 常用方法
    let x: Option<i32> = Some(5);
    let y: Option<i32> = None;

    println!("{}", x.unwrap());           // 5（None 会 panic）
    println!("{}", y.unwrap_or(0));       // 0（提供默认值）
    println!("{}", x.is_some());          // true
    println!("{}", y.is_none());          // true
    println!("{:?}", x.map(|v| v * 2));   // Some(10)
}
```

---

## 4. 模式匹配

### 4.1 match 表达式

```rust
enum Coin {
    Penny,
    Nickel,
    Dime,
    Quarter(String),  // 带州名
}

fn value_in_cents(coin: Coin) -> u32 {
    match coin {
        Coin::Penny => {
            println!("Lucky penny!");
            1
        }
        Coin::Nickel => 5,
        Coin::Dime => 10,
        Coin::Quarter(state) => {
            println!("来自 {} 州的25美分", state);
            25
        }
    }
}

fn main() {
    let x = 5;

    // 匹配字面量
    match x {
        1 => println!("一"),
        2 | 3 => println!("二或三"),      // 多个模式用 |
        4..=10 => println!("四到十"),     // 范围模式
        _ => println!("其他"),            // 通配符（必须穷尽所有情况）
    }

    // 匹配守卫（额外条件）
    let num = Some(4);
    match num {
        Some(x) if x < 5 => println!("小于5: {}", x),
        Some(x) => println!("大于等于5: {}", x),
        None => println!("无值"),
    }

    // @ 绑定（绑定值的同时测试）
    match x {
        n @ 1..=5 => println!("1-5范围内的值: {}", n),
        n @ 6..=10 => println!("6-10范围内的值: {}", n),
        _ => println!("其他"),
    }
}
```

### 4.2 解构

```rust
struct Point {
    x: i32,
    y: i32,
}

enum Message {
    Quit,
    Move { x: i32, y: i32 },
    ChangeColor(i32, i32, i32),
}

fn main() {
    // 解构结构体
    let p = Point { x: 0, y: 7 };
    let Point { x: a, y: b } = p;  // 重命名
    let Point { x, y } = p;        // 简写（变量名与字段名相同）

    match p {
        Point { x: 0, y } => println!("在 y 轴上，y = {}", y),
        Point { x, y: 0 } => println!("在 x 轴上，x = {}", x),
        Point { x, y } => println!("不在轴上: ({}, {})", x, y),
    }

    // 解构枚举
    let msg = Message::ChangeColor(0, 160, 255);
    match msg {
        Message::Quit => println!("退出"),
        Message::Move { x, y } => println!("移动到 ({}, {})", x, y),
        Message::ChangeColor(r, g, b) => println!("RGB: ({}, {}, {})", r, g, b),
    }

    // 解构嵌套结构
    let ((feet, inches), Point { x, y }) = ((3, 10), Point { x: 3, y: -10 });

    // 忽略值
    let numbers = (2, 4, 8, 16, 32);
    let (first, _, third, _, fifth) = numbers;  // _ 忽略单个值
    let (head, ..) = numbers;   // .. 忽略剩余值
    let (.., last) = numbers;   // 获取最后一个
    let (first, .., last) = numbers;  // 获取首尾

    // 忽略未使用的变量（避免警告）
    let _unused = 42;
}
```

### 4.3 if let 和 while let

```rust
fn main() {
    let some_value = Some(3);

    // if let：简化单分支 match
    if let Some(x) = some_value {
        println!("值是: {}", x);
    } else {
        println!("没有值");
    }

    // 等价的 match
    match some_value {
        Some(x) => println!("值是: {}", x),
        _ => println!("没有值"),
    }

    // while let：循环直到模式不匹配
    let mut stack = vec![1, 2, 3];
    while let Some(top) = stack.pop() {
        println!("{}", top);  // 3, 2, 1
    }

    // let else（Rust 1.65+）
    let Some(x) = some_value else {
        println!("没有值");
        return;
    };
    println!("值是: {}", x);
}
```

---

## 5. 错误处理

### 5.1 panic! 与不可恢复错误

```rust
fn main() {
    // 显式 panic
    // panic!("崩溃了！");

    // 数组越界会 panic
    let v = vec![1, 2, 3];
    // v[99];  // panic: index out of bounds

    // 使用 RUST_BACKTRACE=1 运行可查看调用栈
}
```

### 5.2 Result 与可恢复错误

```rust
use std::fs::File;
use std::io::{self, Read};

fn main() {
    // Result 枚举
    // enum Result<T, E> {
    //     Ok(T),
    //     Err(E),
    // }

    // 基本用法
    let file_result = File::open("hello.txt");

    let file = match file_result {
        Ok(f) => f,
        Err(error) => match error.kind() {
            std::io::ErrorKind::NotFound => {
                match File::create("hello.txt") {
                    Ok(fc) => fc,
                    Err(e) => panic!("创建文件失败: {:?}", e),
                }
            }
            other_error => panic!("打开文件失败: {:?}", other_error),
        },
    };

    // 简化写法
    let file = File::open("hello.txt").unwrap();           // 失败则 panic
    let file = File::open("hello.txt").expect("打开失败"); // 自定义 panic 信息

    // unwrap_or_else（推荐）
    let file = File::open("hello.txt").unwrap_or_else(|error| {
        if error.kind() == std::io::ErrorKind::NotFound {
            File::create("hello.txt").unwrap()
        } else {
            panic!("打开文件失败: {:?}", error);
        }
    });
}
```

### 5.3 错误传播

```rust
use std::fs::File;
use std::io::{self, Read};

// 传统方式
fn read_username_from_file_v1() -> Result<String, io::Error> {
    let file_result = File::open("hello.txt");

    let mut file = match file_result {
        Ok(f) => f,
        Err(e) => return Err(e),
    };

    let mut username = String::new();
    match file.read_to_string(&mut username) {
        Ok(_) => Ok(username),
        Err(e) => Err(e),
    }
}

// 使用 ? 操作符（推荐）
fn read_username_from_file_v2() -> Result<String, io::Error> {
    let mut file = File::open("hello.txt")?;  // 失败则提前返回 Err
    let mut username = String::new();
    file.read_to_string(&mut username)?;
    Ok(username)
}

// 链式调用
fn read_username_from_file_v3() -> Result<String, io::Error> {
    let mut username = String::new();
    File::open("hello.txt")?.read_to_string(&mut username)?;
    Ok(username)
}

// 最简洁
fn read_username_from_file_v4() -> Result<String, io::Error> {
    std::fs::read_to_string("hello.txt")
}

// ? 也可用于 Option
fn last_char_of_first_line(text: &str) -> Option<char> {
    text.lines().next()?.chars().last()
}

// main 函数也可以返回 Result
fn main() -> Result<(), Box<dyn std::error::Error>> {
    let content = std::fs::read_to_string("hello.txt")?;
    println!("{}", content);
    Ok(())
}
```

### 5.4 自定义错误类型

```rust
use std::fmt;
use std::error::Error;

// 定义错误枚举
#[derive(Debug)]
enum AppError {
    IoError(std::io::Error),
    ParseError(String),
    NotFound,
    InvalidInput { field: String, message: String },
}

// 实现 Display trait
impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            AppError::IoError(e) => write!(f, "IO错误: {}", e),
            AppError::ParseError(s) => write!(f, "解析错误: {}", s),
            AppError::NotFound => write!(f, "未找到"),
            AppError::InvalidInput { field, message } => {
                write!(f, "无效输入 - {}: {}", field, message)
            }
        }
    }
}

// 实现 Error trait
impl Error for AppError {
    fn source(&self) -> Option<&(dyn Error + 'static)> {
        match self {
            AppError::IoError(e) => Some(e),
            _ => None,
        }
    }
}

// 实现 From trait 以支持 ? 操作符自动转换
impl From<std::io::Error> for AppError {
    fn from(error: std::io::Error) -> Self {
        AppError::IoError(error)
    }
}

fn do_something() -> Result<(), AppError> {
    let _file = std::fs::File::open("test.txt")?;  // io::Error 自动转换为 AppError
    Ok(())
}

// 使用 thiserror crate 简化（推荐）
// use thiserror::Error;
//
// #[derive(Error, Debug)]
// enum AppError {
//     #[error("IO错误: {0}")]
//     IoError(#[from] std::io::Error),
//     #[error("解析错误: {0}")]
//     ParseError(String),
//     #[error("未找到")]
//     NotFound,
// }
```

---

## 6. 泛型

### 6.1 函数泛型

```rust
// 泛型函数
fn largest<T: PartialOrd>(list: &[T]) -> &T {
    let mut largest = &list[0];
    for item in list {
        if item > largest {
            largest = item;
        }
    }
    largest
}

// 多个泛型参数
fn mix<T, U>(t: T, u: U) -> (T, U) {
    (t, u)
}

// 泛型与引用
fn first<T>(list: &[T]) -> Option<&T> {
    list.first()
}

fn main() {
    let numbers = vec![34, 50, 25, 100, 65];
    println!("最大值: {}", largest(&numbers));

    let chars = vec!['y', 'm', 'a', 'q'];
    println!("最大值: {}", largest(&chars));

    let mixed = mix(1, "hello");
    println!("{:?}", mixed);
}
```

### 6.2 结构体和枚举泛型

```rust
// 泛型结构体
struct Point<T> {
    x: T,
    y: T,
}

// 多个泛型参数
struct PointMixed<T, U> {
    x: T,
    y: U,
}

// 为泛型结构体实现方法
impl<T> Point<T> {
    fn x(&self) -> &T {
        &self.x
    }

    fn new(x: T, y: T) -> Self {
        Self { x, y }
    }
}

// 为特定类型实现方法
impl Point<f32> {
    fn distance_from_origin(&self) -> f32 {
        (self.x.powi(2) + self.y.powi(2)).sqrt()
    }
}

// 混合泛型参数
impl<T, U> PointMixed<T, U> {
    fn mixup<V, W>(self, other: PointMixed<V, W>) -> PointMixed<T, W> {
        PointMixed {
            x: self.x,
            y: other.y,
        }
    }
}

// 泛型枚举（标准库示例）
enum Option<T> {
    Some(T),
    None,
}

enum Result<T, E> {
    Ok(T),
    Err(E),
}

fn main() {
    let integer_point = Point::new(5, 10);
    let float_point = Point::new(1.0, 4.0);

    println!("x = {}", integer_point.x());
    println!("距离原点: {}", float_point.distance_from_origin());
}
```

---

## 7. Trait（特征）

### 7.1 定义和实现 Trait

```rust
// 定义 trait
pub trait Summary {
    // 必须实现的方法
    fn summarize_author(&self) -> String;

    // 默认实现（可选覆盖）
    fn summarize(&self) -> String {
        format!("(阅读更多来自 {} 的内容...)", self.summarize_author())
    }
}

// 结构体
pub struct NewsArticle {
    pub headline: String,
    pub author: String,
    pub content: String,
}

pub struct Tweet {
    pub username: String,
    pub content: String,
}

// 为结构体实现 trait
impl Summary for NewsArticle {
    fn summarize_author(&self) -> String {
        self.author.clone()
    }

    // 覆盖默认实现
    fn summarize(&self) -> String {
        format!("{}, by {}", self.headline, self.author)
    }
}

impl Summary for Tweet {
    fn summarize_author(&self) -> String {
        format!("@{}", self.username)
    }
    // 使用默认的 summarize 实现
}

fn main() {
    let article = NewsArticle {
        headline: String::from("重大新闻"),
        author: String::from("张三"),
        content: String::from("内容..."),
    };

    let tweet = Tweet {
        username: String::from("horse_ebooks"),
        content: String::from("of course"),
    };

    println!("{}", article.summarize());
    println!("{}", tweet.summarize());
}
```

### 7.2 Trait 作为参数和返回值

```rust
// impl Trait 语法（语法糖）
pub fn notify(item: &impl Summary) {
    println!("Breaking news! {}", item.summarize());
}

// trait bound 语法（更灵活）
pub fn notify_bound<T: Summary>(item: &T) {
    println!("Breaking news! {}", item.summarize());
}

// 多个 trait bound
pub fn notify_multiple(item: &(impl Summary + std::fmt::Display)) {
    println!("{}", item);
}

// 使用 + 语法
pub fn notify_multiple_bound<T: Summary + std::fmt::Display>(item: &T) {
    println!("{}", item);
}

// where 子句（更清晰，推荐用于复杂情况）
fn some_function<T, U>(t: &T, u: &U) -> i32
where
    T: Summary + Clone,
    U: Clone + std::fmt::Debug,
{
    42
}

// 返回实现了 trait 的类型
fn returns_summarizable() -> impl Summary {
    Tweet {
        username: String::from("horse_ebooks"),
        content: String::from("of course"),
    }
}

// 注意：返回 impl Trait 只能返回单一类型
// 以下代码无法编译：
// fn returns_summarizable(switch: bool) -> impl Summary {
//     if switch {
//         NewsArticle { ... }  // 类型 A
//     } else {
//         Tweet { ... }        // 类型 B，不同于 A
//     }
// }
```

### 7.3 常用标准库 Trait

```rust
use std::fmt;
use std::ops::Add;
use std::cmp::Ordering;

// Debug - 调试输出 {:?}
#[derive(Debug)]
struct Point {
    x: i32,
    y: i32,
}

// Clone 和 Copy
#[derive(Clone, Copy)]  // Copy 要求 Clone
struct Color(u8, u8, u8);

// PartialEq 和 Eq - 相等比较
#[derive(PartialEq, Eq)]
struct Person {
    name: String,
    age: u32,
}

// PartialOrd 和 Ord - 排序比较
#[derive(PartialEq, Eq, PartialOrd, Ord)]
struct Score(u32);

// Display - 用户友好输出 {}
impl fmt::Display for Point {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "({}, {})", self.x, self.y)
    }
}

// 运算符重载 - Add trait
impl Add for Point {
    type Output = Point;  // 关联类型

    fn add(self, other: Point) -> Point {
        Point {
            x: self.x + other.x,
            y: self.y + other.y,
        }
    }
}

// Default - 默认值
#[derive(Default)]
struct Config {
    debug: bool,      // 默认 false
    timeout: u32,     // 默认 0
    name: String,     // 默认 ""
}

// 自定义 Default
impl Default for Point {
    fn default() -> Self {
        Point { x: 0, y: 0 }
    }
}

// From 和 Into - 类型转换
impl From<(i32, i32)> for Point {
    fn from(tuple: (i32, i32)) -> Self {
        Point { x: tuple.0, y: tuple.1 }
    }
}

// Drop - 析构函数
struct CustomSmartPointer {
    data: String,
}

impl Drop for CustomSmartPointer {
    fn drop(&mut self) {
        println!("Dropping CustomSmartPointer with data `{}`!", self.data);
    }
}

fn main() {
    let p1 = Point { x: 1, y: 2 };
    let p2 = Point { x: 3, y: 4 };
    let p3 = p1 + p2;

    println!("{:?}", p3);  // Debug
    println!("{}", p3);    // Display

    let config = Config::default();
    let point = Point::default();

    // From/Into 转换
    let p: Point = (5, 6).into();
    let p: Point = Point::from((5, 6));

    // Drop 自动调用
    {
        let c = CustomSmartPointer { data: String::from("hello") };
    }  // c 在这里被 drop
}
```

### 7.4 Trait 对象与动态分发

```rust
pub trait Draw {
    fn draw(&self);
}

struct Button {
    label: String,
}

struct TextField {
    placeholder: String,
}

impl Draw for Button {
    fn draw(&self) {
        println!("绘制按钮: {}", self.label);
    }
}

impl Draw for TextField {
    fn draw(&self) {
        println!("绘制文本框: {}", self.placeholder);
    }
}

// 使用 trait 对象（动态分发）
struct Screen {
    // dyn Draw 是 trait 对象，Box 提供堆分配
    components: Vec<Box<dyn Draw>>,
}

impl Screen {
    fn run(&self) {
        for component in self.components.iter() {
            component.draw();  // 运行时确定调用哪个实现
        }
    }
}

fn main() {
    let screen = Screen {
        components: vec![
            Box::new(Button { label: String::from("OK") }),
            Box::new(TextField { placeholder: String::from("输入...") }),
        ],
    };

    screen.run();
}

// 对象安全的 trait 才能用作 trait 对象
// 规则：
// 1. 返回类型不能是 Self
// 2. 方法没有泛型参数
```

---

## 8. 生命周期

### 8.1 生命周期基础

```rust
// 生命周期注解语法：'a（撇号 + 小写字母）
// 生命周期注解不改变引用的生命周期，只是描述多个引用之间的关系

// 问题：编译器不知道返回的引用来自 x 还是 y
// fn longest(x: &str, y: &str) -> &str { ... }  // 错误

// 解决：使用生命周期注解
fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {
    if x.len() > y.len() {
        x
    } else {
        y
    }
}
// 含义：返回值的生命周期等于 x 和 y 中较短的那个

fn main() {
    let string1 = String::from("long string is long");
    let result;
    {
        let string2 = String::from("xyz");
        result = longest(string1.as_str(), string2.as_str());
        println!("最长的字符串是: {}", result);  // OK
    }
    // println!("{}", result);  // 错误！string2 已离开作用域
}

// 只有一个参数需要生命周期时
fn first<'a>(x: &'a str, _y: &str) -> &'a str {
    x  // 返回值只与 x 相关
}
```

### 8.2 结构体中的生命周期

```rust
// 持有引用的结构体必须标注生命周期
struct ImportantExcerpt<'a> {
    part: &'a str,  // 结构体实例的生命周期不能超过 part 引用的数据
}

impl<'a> ImportantExcerpt<'a> {
    // 生命周期省略规则自动推断
    fn level(&self) -> i32 {
        3
    }

    // 返回引用时需要考虑生命周期
    fn announce_and_return_part(&self, announcement: &str) -> &str {
        println!("Attention please: {}", announcement);
        self.part  // 返回 self 的生命周期
    }
}

fn main() {
    let novel = String::from("Call me Ishmael. Some years ago...");
    let first_sentence = novel.split('.').next().unwrap();

    let excerpt = ImportantExcerpt {
        part: first_sentence,
    };

    println!("{}", excerpt.part);
}
```

### 8.3 生命周期省略规则

```rust
// 编译器自动推断生命周期的三条规则：

// 规则1：每个引用参数都有自己的生命周期
// fn foo(x: &str, y: &str) -> fn foo<'a, 'b>(x: &'a str, y: &'b str)

// 规则2：如果只有一个输入生命周期，它被赋给所有输出生命周期
// fn foo(x: &str) -> &str -> fn foo<'a>(x: &'a str) -> &'a str

// 规则3：如果有 &self 或 &mut self，self 的生命周期被赋给所有输出
// fn foo(&self, x: &str) -> &str -> fn foo<'a>(&'a self, x: &str) -> &'a str

// 以下函数不需要显式标注（规则2）
fn first_word(s: &str) -> &str {
    let bytes = s.as_bytes();
    for (i, &item) in bytes.iter().enumerate() {
        if item == b' ' {
            return &s[0..i];
        }
    }
    &s[..]
}
```

### 8.4 静态生命周期

```rust
// 'static 生命周期：整个程序运行期间都有效
let s: &'static str = "I have a static lifetime.";
// 字符串字面量都是 'static 的，因为它们存储在程序二进制中

// 泛型 + trait bound + 生命周期
fn longest_with_announcement<'a, T>(
    x: &'a str,
    y: &'a str,
    ann: T,
) -> &'a str
where
    T: std::fmt::Display,
{
    println!("Announcement! {}", ann);
    if x.len() > y.len() {
        x
    } else {
        y
    }
}

// 注意：不要滥用 'static，大多数情况下不需要
```

---

## 9. 闭包与迭代器

### 9.1 闭包

```rust
fn main() {
    // 闭包语法
    let add_one_v1 = |x: i32| -> i32 { x + 1 };  // 完整标注
    let add_one_v2 = |x: i32| x + 1;             // 省略返回类型
    let add_one_v3 = |x| x + 1;                  // 省略参数类型（需要使用时推断）

    println!("{}", add_one_v1(5));

    // 捕获环境中的变量
    let x = 4;
    let equal_to_x = |z| z == x;  // 闭包捕获了 x
    assert!(equal_to_x(4));

    // 三种捕获方式（编译器自动选择最小权限）

    // 1. Fn - 不可变借用
    let s = String::from("hello");
    let print_s = || println!("{}", s);  // 借用 s
    print_s();
    print_s();  // 可以多次调用
    println!("{}", s);  // s 仍然可用

    // 2. FnMut - 可变借用
    let mut count = 0;
    let mut increment = || {
        count += 1;  // 可变借用 count
        println!("count: {}", count);
    };
    increment();
    increment();

    // 3. FnOnce - 获取所有权
    let s = String::from("hello");
    let consume = move || {  // move 强制获取所有权
        println!("{}", s);
        drop(s);  // 消耗 s
    };
    consume();
    // consume();  // 错误！只能调用一次
    // println!("{}", s);  // 错误！s 已被移动
}
```

### 9.2 闭包作为参数和返回值

```rust
// 闭包作为参数
fn apply<F>(f: F)
where
    F: FnOnce(),  // 至少调用一次
{
    f();
}

fn apply_twice<F>(mut f: F)
where
    F: FnMut(),  // 可能修改捕获的变量
{
    f();
    f();
}

fn apply_many<F>(f: F, times: u32)
where
    F: Fn(),  // 不修改捕获的变量
{
    for _ in 0..times {
        f();
    }
}

// 返回闭包
fn make_adder(x: i32) -> impl Fn(i32) -> i32 {
    move |y| x + y  // move 获取 x 的所有权
}

// 返回不同闭包（需要 Box）
fn make_operation(op: &str) -> Box<dyn Fn(i32, i32) -> i32> {
    match op {
        "add" => Box::new(|a, b| a + b),
        "sub" => Box::new(|a, b| a - b),
        _ => Box::new(|a, b| a * b),
    }
}

fn main() {
    let add_5 = make_adder(5);
    println!("{}", add_5(10));  // 15

    let op = make_operation("add");
    println!("{}", op(3, 4));  // 7
}
```

### 9.3 迭代器

```rust
fn main() {
    let v = vec![1, 2, 3];

    // 创建迭代器的三种方式
    let iter1 = v.iter();       // 不可变引用 &T
    let iter2 = v.iter_mut();   // 可变引用 &mut T（需要 mut v）
    let iter3 = v.into_iter();  // 获取所有权 T

    // 消费适配器（消耗迭代器）
    let v = vec![1, 2, 3];
    let total: i32 = v.iter().sum();           // 求和
    let count = v.iter().count();              // 计数
    let collected: Vec<_> = v.iter().collect(); // 收集

    // 迭代器适配器（惰性求值，返回新迭代器）
    let v = vec![1, 2, 3, 4, 5];

    let result: Vec<i32> = v
        .iter()
        .map(|x| x * 2)           // 映射：[2, 4, 6, 8, 10]
        .filter(|x| *x > 4)       // 过滤：[6, 8, 10]
        .collect();               // 收集
    println!("{:?}", result);

    // 常用迭代器方法
    let v = vec![1, 2, 3, 4, 5];

    // find - 查找第一个匹配项
    let found: Option<&i32> = v.iter().find(|&&x| x == 3);

    // position - 查找索引
    let pos: Option<usize> = v.iter().position(|&x| x == 3);

    // any / all - 条件判断
    let has_even = v.iter().any(|&x| x % 2 == 0);   // true
    let all_positive = v.iter().all(|&x| x > 0);    // true

    // fold - 折叠（reduce）
    let sum = v.iter().fold(0, |acc, &x| acc + x);  // 15
    let product = v.iter().fold(1, |acc, &x| acc * x);  // 120

    // enumerate - 带索引
    for (index, value) in v.iter().enumerate() {
        println!("{}: {}", index, value);
    }

    // zip - 合并两个迭代器
    let a = [1, 2, 3];
    let b = [4, 5, 6];
    let zipped: Vec<_> = a.iter().zip(b.iter()).collect();
    // [(1, 4), (2, 5), (3, 6)]

    // take / skip - 取前n个 / 跳过前n个
    let first_two: Vec<_> = v.iter().take(2).collect();  // [1, 2]
    let skip_two: Vec<_> = v.iter().skip(2).collect();   // [3, 4, 5]

    // chain - 连接迭代器
    let chained: Vec<_> = a.iter().chain(b.iter()).collect();
    // [1, 2, 3, 4, 5, 6]

    // flat_map - 映射并展平
    let words = vec!["hello", "world"];
    let chars: Vec<char> = words.iter().flat_map(|s| s.chars()).collect();
    // ['h', 'e', 'l', 'l', 'o', 'w', 'o', 'r', 'l', 'd']

    // partition - 分区
    let (even, odd): (Vec<_>, Vec<_>) = v.iter().partition(|&&x| x % 2 == 0);

    // max / min
    let max = v.iter().max();  // Some(&5)
    let min = v.iter().min();  // Some(&1)

    // max_by / min_by - 自定义比较
    let max_by_abs = v.iter().max_by(|a, b| a.abs().cmp(&b.abs()));
}
```

### 9.4 自定义迭代器

```rust
struct Counter {
    count: u32,
    max: u32,
}

impl Counter {
    fn new(max: u32) -> Counter {
        Counter { count: 0, max }
    }
}

// 实现 Iterator trait
impl Iterator for Counter {
    type Item = u32;  // 关联类型

    fn next(&mut self) -> Option<Self::Item> {
        if self.count < self.max {
            self.count += 1;
            Some(self.count)
        } else {
            None
        }
    }
}

fn main() {
    let counter = Counter::new(5);

    for num in counter {
        println!("{}", num);  // 1, 2, 3, 4, 5
    }

    // 使用迭代器适配器
    let sum: u32 = Counter::new(5)
        .zip(Counter::new(5).skip(1))
        .map(|(a, b)| a * b)
        .filter(|x| x % 3 == 0)
        .sum();
    println!("sum: {}", sum);
}
```

---

## 10. 智能指针

### 10.1 Box<T> - 堆分配

```rust
fn main() {
    // Box 将数据存储在堆上
    let b = Box::new(5);
    println!("b = {}", b);

    // 使用场景1：编译时大小未知的类型
    // 递归类型
    enum List {
        Cons(i32, Box<List>),
        Nil,
    }

    use List::{Cons, Nil};
    let list = Cons(1, Box::new(Cons(2, Box::new(Cons(3, Box::new(Nil))))));

    // 使用场景2：大量数据转移所有权而不复制
    let large_data = Box::new([0u8; 1000000]);

    // 使用场景3：trait 对象
    let draw: Box<dyn std::fmt::Debug> = Box::new("hello");
}
```

### 10.2 Rc<T> - 引用计数

```rust
use std::rc::Rc;

fn main() {
    // Rc 允许多个所有者（单线程）
    let a = Rc::new(String::from("hello"));
    println!("引用计数: {}", Rc::strong_count(&a));  // 1

    let b = Rc::clone(&a);  // 增加引用计数，不是深拷贝
    println!("引用计数: {}", Rc::strong_count(&a));  // 2

    {
        let c = Rc::clone(&a);
        println!("引用计数: {}", Rc::strong_count(&a));  // 3
    }  // c 离开作用域，引用计数减1

    println!("引用计数: {}", Rc::strong_count(&a));  // 2

    // Rc 是不可变的，如需可变性，配合 RefCell 使用
}

// 使用场景：图数据结构、多个部分共享数据
enum List {
    Cons(i32, Rc<List>),
    Nil,
}

use List::{Cons, Nil};

fn main() {
    let a = Rc::new(Cons(5, Rc::new(Cons(10, Rc::new(Nil)))));
    let b = Cons(3, Rc::clone(&a));  // b 和 c 共享 a
    let c = Cons(4, Rc::clone(&a));
}
```

### 10.3 RefCell<T> - 内部可变性

```rust
use std::cell::RefCell;

fn main() {
    // RefCell 允许在运行时检查借用规则
    let data = RefCell::new(5);

    // 不可变借用
    let r1 = data.borrow();
    println!("r1 = {}", r1);
    drop(r1);  // 必须先释放

    // 可变借用
    *data.borrow_mut() += 1;
    println!("data = {:?}", data);

    // 运行时 panic（违反借用规则）
    // let r1 = data.borrow();
    // let r2 = data.borrow_mut();  // panic!
}

// Rc<RefCell<T>> 组合：多所有者 + 可变
use std::rc::Rc;

#[derive(Debug)]
struct Node {
    value: i32,
    children: RefCell<Vec<Rc<Node>>>,
}

fn main() {
    let leaf = Rc::new(Node {
        value: 3,
        children: RefCell::new(vec![]),
    });

    let branch = Rc::new(Node {
        value: 5,
        children: RefCell::new(vec![Rc::clone(&leaf)]),
    });

    // 修改 leaf 的 children
    leaf.children.borrow_mut().push(Rc::new(Node {
        value: 10,
        children: RefCell::new(vec![]),
    }));

    println!("{:?}", leaf);
}
```

### 10.4 Weak<T> - 弱引用

```rust
use std::rc::{Rc, Weak};
use std::cell::RefCell;

// 避免循环引用
#[derive(Debug)]
struct Node {
    value: i32,
    parent: RefCell<Weak<Node>>,    // 弱引用，不增加引用计数
    children: RefCell<Vec<Rc<Node>>>,
}

fn main() {
    let leaf = Rc::new(Node {
        value: 3,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![]),
    });

    println!("leaf parent = {:?}", leaf.parent.borrow().upgrade());  // None

    let branch = Rc::new(Node {
        value: 5,
        parent: RefCell::new(Weak::new()),
        children: RefCell::new(vec![Rc::clone(&leaf)]),
    });

    // 设置 leaf 的 parent
    *leaf.parent.borrow_mut() = Rc::downgrade(&branch);

    println!("leaf parent = {:?}", leaf.parent.borrow().upgrade());  // Some(...)

    // Weak 不阻止值被释放
    // upgrade() 返回 Option<Rc<T>>
}
```

### 10.5 Cow<T> - 写时复制

```rust
use std::borrow::Cow;

fn process_text(text: &str) -> Cow<str> {
    if text.contains("bad") {
        // 需要修改时才分配新内存
        Cow::Owned(text.replace("bad", "good"))
    } else {
        // 不需要修改时直接借用
        Cow::Borrowed(text)
    }
}

fn main() {
    let text1 = "hello world";
    let result1 = process_text(text1);
    println!("{}", result1);  // 借用，无分配

    let text2 = "bad world";
    let result2 = process_text(text2);
    println!("{}", result2);  // "good world"，新分配

    // 转换为拥有的值
    let owned: String = result2.into_owned();
}
```

---

## 11. 并发编程

### 11.1 线程

```rust
use std::thread;
use std::time::Duration;

fn main() {
    // 创建线程
    let handle = thread::spawn(|| {
        for i in 1..10 {
            println!("子线程: {}", i);
            thread::sleep(Duration::from_millis(1));
        }
    });

    for i in 1..5 {
        println!("主线程: {}", i);
        thread::sleep(Duration::from_millis(1));
    }

    // 等待线程完成
    handle.join().unwrap();

    // move 闭包：转移所有权到线程
    let v = vec![1, 2, 3];
    let handle = thread::spawn(move || {
        println!("向量: {:?}", v);
    });
    // println!("{:?}", v);  // 错误！v 已被移动
    handle.join().unwrap();
}
```

### 11.2 消息传递（Channel）

```rust
use std::sync::mpsc;  // multiple producer, single consumer
use std::thread;
use std::time::Duration;

fn main() {
    // 创建通道
    let (tx, rx) = mpsc::channel();

    // 发送端移动到新线程
    thread::spawn(move || {
        let val = String::from("hi");
        tx.send(val).unwrap();
        // println!("{}", val);  // 错误！val 已被发送（移动）
    });

    // 接收
    let received = rx.recv().unwrap();  // 阻塞等待
    println!("收到: {}", received);

    // 发送多个值
    let (tx, rx) = mpsc::channel();

    thread::spawn(move || {
        let vals = vec![
            String::from("hi"),
            String::from("from"),
            String::from("the"),
            String::from("thread"),
        ];

        for val in vals {
            tx.send(val).unwrap();
            thread::sleep(Duration::from_millis(200));
        }
    });

    // 将 rx 作为迭代器
    for received in rx {
        println!("收到: {}", received);
    }

    // 多个发送者
    let (tx, rx) = mpsc::channel();
    let tx1 = tx.clone();  // 克隆发送端

    thread::spawn(move || {
        tx.send(String::from("from tx")).unwrap();
    });

    thread::spawn(move || {
        tx1.send(String::from("from tx1")).unwrap();
    });

    for received in rx {
        println!("收到: {}", received);
    }
}
```

### 11.3 共享状态（Mutex）

```rust
use std::sync::{Arc, Mutex};
use std::thread;

fn main() {
    // Mutex - 互斥锁
    let m = Mutex::new(5);

    {
        let mut num = m.lock().unwrap();  // 获取锁
        *num = 6;
    }  // 锁自动释放

    println!("m = {:?}", m);

    // 多线程共享 Mutex（需要 Arc）
    let counter = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            let mut num = counter.lock().unwrap();
            *num += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("结果: {}", *counter.lock().unwrap());  // 10
}

// RwLock - 读写锁（多读单写）
use std::sync::RwLock;

fn main() {
    let lock = RwLock::new(5);

    // 多个读取者
    {
        let r1 = lock.read().unwrap();
        let r2 = lock.read().unwrap();
        println!("r1 = {}, r2 = {}", r1, r2);
    }

    // 单个写入者
    {
        let mut w = lock.write().unwrap();
        *w += 1;
    }
}
```

### 11.4 原子类型

```rust
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::Arc;
use std::thread;

fn main() {
    let counter = Arc::new(AtomicUsize::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let counter = Arc::clone(&counter);
        let handle = thread::spawn(move || {
            for _ in 0..1000 {
                counter.fetch_add(1, Ordering::SeqCst);
            }
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.join().unwrap();
    }

    println!("结果: {}", counter.load(Ordering::SeqCst));  // 10000
}
```

### 11.5 Send 和 Sync Trait

```rust
// Send：类型可以安全地在线程间转移所有权
// Sync：类型可以安全地在线程间共享引用

// 大多数类型都是 Send + Sync
// Rc<T> 不是 Send（使用 Arc<T> 代替）
// RefCell<T> 不是 Sync（使用 Mutex<T> 代替）
// 裸指针 *const T 和 *mut T 都不是

// 手动实现（不安全）
// unsafe impl Send for MyType {}
// unsafe impl Sync for MyType {}
```

---

## 12. 异步编程

### 12.1 async/await 基础

```rust
// 需要添加依赖：tokio = { version = "1", features = ["full"] }

use std::time::Duration;

// async 函数返回 Future
async fn hello() -> String {
    "Hello".to_string()
}

async fn delayed_hello() -> String {
    tokio::time::sleep(Duration::from_secs(1)).await;
    "Hello after 1 second".to_string()
}

// async 块
async fn example() {
    let future = async {
        println!("异步块");
        42
    };

    let result = future.await;
    println!("结果: {}", result);
}

#[tokio::main]
async fn main() {
    // .await 等待 Future 完成
    let result = hello().await;
    println!("{}", result);

    let result = delayed_hello().await;
    println!("{}", result);
}
```

### 12.2 并发执行

```rust
use tokio::time::{sleep, Duration};

async fn task1() -> i32 {
    sleep(Duration::from_secs(1)).await;
    println!("任务1完成");
    1
}

async fn task2() -> i32 {
    sleep(Duration::from_secs(2)).await;
    println!("任务2完成");
    2
}

#[tokio::main]
async fn main() {
    // 顺序执行（总共3秒）
    let r1 = task1().await;
    let r2 = task2().await;
    println!("顺序结果: {} + {} = {}", r1, r2, r1 + r2);

    // 并发执行（总共2秒）
    let (r1, r2) = tokio::join!(task1(), task2());
    println!("并发结果: {} + {} = {}", r1, r2, r1 + r2);

    // select! - 等待第一个完成
    tokio::select! {
        r = task1() => println!("task1 先完成: {}", r),
        r = task2() => println!("task2 先完成: {}", r),
    }
}
```

### 12.3 Spawn 任务

```rust
use tokio::time::{sleep, Duration};

#[tokio::main]
async fn main() {
    // spawn 创建独立任务
    let handle = tokio::spawn(async {
        sleep(Duration::from_secs(1)).await;
        "任务完成"
    });

    // 做其他事情...
    println!("主任务继续执行");

    // 等待任务完成
    let result = handle.await.unwrap();
    println!("{}", result);

    // 多个任务
    let mut handles = vec![];
    for i in 0..5 {
        let handle = tokio::spawn(async move {
            sleep(Duration::from_millis(100 * i)).await;
            i * 2
        });
        handles.push(handle);
    }

    for handle in handles {
        let result = handle.await.unwrap();
        println!("结果: {}", result);
    }
}
```

### 12.4 异步 Channel

```rust
use tokio::sync::mpsc;

#[tokio::main]
async fn main() {
    // 创建有界通道
    let (tx, mut rx) = mpsc::channel(32);

    // 发送者
    let tx1 = tx.clone();
    tokio::spawn(async move {
        tx1.send("from task 1").await.unwrap();
    });

    tokio::spawn(async move {
        tx.send("from task 2").await.unwrap();
    });

    // 接收
    while let Some(message) = rx.recv().await {
        println!("收到: {}", message);
    }
}

// oneshot - 单次发送
use tokio::sync::oneshot;

#[tokio::main]
async fn main() {
    let (tx, rx) = oneshot::channel();

    tokio::spawn(async move {
        tx.send("单次消息").unwrap();
    });

    let result = rx.await.unwrap();
    println!("{}", result);
}
```

### 12.5 异步 Mutex

```rust
use std::sync::Arc;
use tokio::sync::Mutex;

#[tokio::main]
async fn main() {
    let data = Arc::new(Mutex::new(0));
    let mut handles = vec![];

    for _ in 0..10 {
        let data = Arc::clone(&data);
        let handle = tokio::spawn(async move {
            let mut lock = data.lock().await;
            *lock += 1;
        });
        handles.push(handle);
    }

    for handle in handles {
        handle.await.unwrap();
    }

    println!("结果: {}", *data.lock().await);
}
```

---

## 13. 宏

### 13.1 声明宏（macro_rules!）

```rust
// 基本宏
macro_rules! say_hello {
    () => {
        println!("Hello!");
    };
}

// 带参数的宏
macro_rules! create_function {
    ($func_name:ident) => {
        fn $func_name() {
            println!("调用了函数: {}", stringify!($func_name));
        }
    };
}

create_function!(foo);
create_function!(bar);

// 多种模式匹配
macro_rules! print_result {
    ($expression:expr) => {
        println!("{:?} = {:?}", stringify!($expression), $expression);
    };
}

// 重复模式
macro_rules! vec_of_strings {
    ($($element:expr),*) => {
        {
            let mut v = Vec::new();
            $(
                v.push($element.to_string());
            )*
            v
        }
    };
}

// 实现类似 vec! 的宏
macro_rules! my_vec {
    () => {
        Vec::new()
    };
    ($($x:expr),+ $(,)?) => {
        {
            let mut temp_vec = Vec::new();
            $(
                temp_vec.push($x);
            )+
            temp_vec
        }
    };
}

fn main() {
    say_hello!();

    foo();
    bar();

    print_result!(1 + 2);

    let v = vec_of_strings!["a", "b", "c"];
    println!("{:?}", v);

    let v = my_vec![1, 2, 3];
    println!("{:?}", v);
}
```

### 13.2 过程宏

```rust
// 过程宏需要在单独的 crate 中定义
// Cargo.toml:
// [lib]
// proc-macro = true

// 三种类型：
// 1. 派生宏 #[derive(MyMacro)]
// 2. 属性宏 #[my_attribute]
// 3. 函数式宏 my_macro!(...)

// 示例：派生宏（需要 syn 和 quote crate）
use proc_macro::TokenStream;
use quote::quote;
use syn;

#[proc_macro_derive(HelloMacro)]
pub fn hello_macro_derive(input: TokenStream) -> TokenStream {
    let ast = syn::parse(input).unwrap();
    impl_hello_macro(&ast)
}

fn impl_hello_macro(ast: &syn::DeriveInput) -> TokenStream {
    let name = &ast.ident;
    let gen = quote! {
        impl HelloMacro for #name {
            fn hello_macro() {
                println!("Hello, Macro! My name is {}!", stringify!(#name));
            }
        }
    };
    gen.into()
}

// 使用派生宏
// use hello_macro::HelloMacro;
// use hello_macro_derive::HelloMacro;
//
// #[derive(HelloMacro)]
// struct Pancakes;
//
// fn main() {
//     Pancakes::hello_macro();
// }
```

### 13.3 常用内置宏

```rust
fn main() {
    // println! / print! - 格式化输出
    println!("Hello, {}!", "world");
    println!("{:?}", vec![1, 2, 3]);  // Debug 格式
    println!("{:#?}", vec![1, 2, 3]); // 美化 Debug
    println!("{:04}", 42);            // 补零：0042
    println!("{:.2}", 3.14159);       // 小数位：3.14

    // format! - 格式化字符串
    let s = format!("{} + {} = {}", 1, 2, 3);

    // vec! - 创建 Vec
    let v = vec![1, 2, 3];

    // panic! - 触发 panic
    // panic!("出错了！");

    // assert! / assert_eq! / assert_ne! - 断言
    assert!(1 + 1 == 2);
    assert_eq!(2 + 2, 4);
    assert_ne!(1, 2);

    // dbg! - 调试输出（打印文件名、行号、表达式和值）
    let x = dbg!(5 * 2);  // [src/main.rs:10] 5 * 2 = 10

    // todo! / unimplemented! - 占位符
    fn not_implemented() {
        todo!("还没实现");
    }

    // include_str! / include_bytes! - 编译时包含文件
    // let content = include_str!("data.txt");
    // let bytes = include_bytes!("image.png");

    // env! / option_env! - 编译时环境变量
    let path = env!("PATH");
    let maybe_var = option_env!("MY_VAR");

    // cfg! - 条件编译检查
    if cfg!(target_os = "windows") {
        println!("Windows");
    }

    // concat! - 编译时字符串拼接
    let s = concat!("Hello", ", ", "World");

    // stringify! - 将标识符转为字符串
    let s = stringify!(some_identifier);  // "some_identifier"
}
```

---

## 14. 模块系统

### 14.1 模块定义

```rust
// 方式1：在同一文件中定义模块
mod front_of_house {
    pub mod hosting {
        pub fn add_to_waitlist() {}
        fn seat_at_table() {}  // 私有
    }

    mod serving {  // 私有模块
        fn take_order() {}
        fn serve_order() {}
    }
}

// 方式2：在单独文件中定义
// src/front_of_house.rs 或 src/front_of_house/mod.rs

// 使用模块
pub fn eat_at_restaurant() {
    // 绝对路径
    crate::front_of_house::hosting::add_to_waitlist();

    // 相对路径
    front_of_house::hosting::add_to_waitlist();
}

// super 关键字（父模块）
mod back_of_house {
    fn fix_incorrect_order() {
        cook_order();
        super::deliver_order();  // 调用父模块的函数
    }

    fn cook_order() {}
}

fn deliver_order() {}
```

### 14.2 use 关键字

```rust
// 引入模块
use crate::front_of_house::hosting;

pub fn eat_at_restaurant() {
    hosting::add_to_waitlist();
}

// 引入函数（不推荐，不清晰）
use crate::front_of_house::hosting::add_to_waitlist;

// 重命名
use std::fmt::Result;
use std::io::Result as IoResult;

// 重新导出
pub use crate::front_of_house::hosting;

// 嵌套路径
use std::io::{self, Write};
use std::{cmp::Ordering, io};

// 通配符（不推荐）
use std::collections::*;
```

### 14.3 项目结构

```
my_project/
├── Cargo.toml
├── src/
│   ├── main.rs          # 二进制入口
│   ├── lib.rs           # 库入口
│   ├── front_of_house/  # 模块目录
│   │   ├── mod.rs       # 模块声明
│   │   └── hosting.rs   # 子模块
│   └── back_of_house.rs # 模块文件
```

```rust
// src/lib.rs
mod front_of_house;  // 声明模块
mod back_of_house;

pub use crate::front_of_house::hosting;

// src/front_of_house/mod.rs
pub mod hosting;

// src/front_of_house/hosting.rs
pub fn add_to_waitlist() {}

// src/back_of_house.rs
pub struct Breakfast {
    pub toast: String,
    seasonal_fruit: String,  // 私有字段
}

impl Breakfast {
    pub fn summer(toast: &str) -> Breakfast {
        Breakfast {
            toast: String::from(toast),
            seasonal_fruit: String::from("peaches"),
        }
    }
}
```

---

## 15. 实战项目示例

### 15.1 命令行工具

```rust
// Cargo.toml:
// [dependencies]
// clap = { version = "4", features = ["derive"] }

use clap::Parser;
use std::fs;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(name = "minigrep")]
#[command(about = "A simple grep-like tool", long_about = None)]
struct Args {
    /// 要搜索的模式
    pattern: String,

    /// 要搜索的文件
    path: PathBuf,

    /// 忽略大小写
    #[arg(short, long)]
    ignore_case: bool,
}

fn main() {
    let args = Args::parse();

    let contents = fs::read_to_string(&args.path)
        .expect("无法读取文件");

    let results = if args.ignore_case {
        search_case_insensitive(&args.pattern, &contents)
    } else {
        search(&args.pattern, &contents)
    };

    for line in results {
        println!("{}", line);
    }
}

fn search<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    contents
        .lines()
        .filter(|line| line.contains(query))
        .collect()
}

fn search_case_insensitive<'a>(query: &str, contents: &'a str) -> Vec<&'a str> {
    let query = query.to_lowercase();
    contents
        .lines()
        .filter(|line| line.to_lowercase().contains(&query))
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn case_sensitive() {
        let query = "duct";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Duct tape.";

        assert_eq!(vec!["safe, fast, productive."], search(query, contents));
    }

    #[test]
    fn case_insensitive() {
        let query = "rUsT";
        let contents = "\
Rust:
safe, fast, productive.
Pick three.
Trust me.";

        assert_eq!(
            vec!["Rust:", "Trust me."],
            search_case_insensitive(query, contents)
        );
    }
}
```

### 15.2 Web API 服务

```rust
// Cargo.toml:
// [dependencies]
// axum = "0.7"
// tokio = { version = "1", features = ["full"] }
// serde = { version = "1", features = ["derive"] }
// serde_json = "1"

use axum::{
    extract::{Path, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, RwLock};

// 数据模型
#[derive(Debug, Serialize, Deserialize, Clone)]
struct User {
    id: u64,
    name: String,
    email: String,
}

#[derive(Debug, Deserialize)]
struct CreateUser {
    name: String,
    email: String,
}

// 应用状态
type AppState = Arc<RwLock<HashMap<u64, User>>>;

#[tokio::main]
async fn main() {
    let state: AppState = Arc::new(RwLock::new(HashMap::new()));

    let app = Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id", get(get_user).delete(delete_user))
        .with_state(state);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3000").await.unwrap();
    println!("服务器运行在 http://localhost:3000");
    axum::serve(listener, app).await.unwrap();
}

// 处理函数
async fn list_users(State(state): State<AppState>) -> Json<Vec<User>> {
    let users = state.read().unwrap();
    Json(users.values().cloned().collect())
}

async fn get_user(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> Result<Json<User>, StatusCode> {
    let users = state.read().unwrap();
    users
        .get(&id)
        .cloned()
        .map(Json)
        .ok_or(StatusCode::NOT_FOUND)
}

async fn create_user(
    State(state): State<AppState>,
    Json(input): Json<CreateUser>,
) -> (StatusCode, Json<User>) {
    let mut users = state.write().unwrap();
    let id = users.len() as u64 + 1;
    let user = User {
        id,
        name: input.name,
        email: input.email,
    };
    users.insert(id, user.clone());
    (StatusCode::CREATED, Json(user))
}

async fn delete_user(
    State(state): State<AppState>,
    Path(id): Path<u64>,
) -> StatusCode {
    let mut users = state.write().unwrap();
    if users.remove(&id).is_some() {
        StatusCode::NO_CONTENT
    } else {
        StatusCode::NOT_FOUND
    }
}
```

### 15.3 数据库操作（SQLite）

```rust
// Cargo.toml:
// [dependencies]
// rusqlite = { version = "0.32", features = ["bundled"] }
// chrono = "0.4"

use rusqlite::{Connection, Result, params};
use chrono::{DateTime, Utc};

#[derive(Debug)]
struct Task {
    id: i32,
    title: String,
    completed: bool,
    created_at: String,
}

fn main() -> Result<()> {
    let conn = Connection::open("tasks.db")?;

    // 创建表
    conn.execute(
        "CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY,
            title TEXT NOT NULL,
            completed INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL
        )",
        [],
    )?;

    // 插入数据
    let now = Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO tasks (title, created_at) VALUES (?1, ?2)",
        params!["学习 Rust", &now],
    )?;

    // 查询数据
    let mut stmt = conn.prepare("SELECT id, title, completed, created_at FROM tasks")?;
    let task_iter = stmt.query_map([], |row| {
        Ok(Task {
            id: row.get(0)?,
            title: row.get(1)?,
            completed: row.get(2)?,
            created_at: row.get(3)?,
        })
    })?;

    for task in task_iter {
        println!("{:?}", task?);
    }

    // 更新数据
    conn.execute(
        "UPDATE tasks SET completed = 1 WHERE id = ?1",
        params![1],
    )?;

    // 删除数据
    conn.execute("DELETE FROM tasks WHERE id = ?1", params![1])?;

    Ok(())
}
```

### 15.4 文件操作工具

```rust
use std::fs::{self, File};
use std::io::{self, BufRead, BufReader, Write};
use std::path::Path;

fn main() -> io::Result<()> {
    // 读取整个文件
    let content = fs::read_to_string("input.txt")?;
    println!("{}", content);

    // 逐行读取
    let file = File::open("input.txt")?;
    let reader = BufReader::new(file);
    for line in reader.lines() {
        println!("{}", line?);
    }

    // 写入文件
    let mut file = File::create("output.txt")?;
    file.write_all(b"Hello, World!\n")?;
    writeln!(file, "Line 2")?;

    // 追加写入
    let mut file = fs::OpenOptions::new()
        .append(true)
        .open("output.txt")?;
    writeln!(file, "Appended line")?;

    // 遍历目录
    fn visit_dirs(dir: &Path) -> io::Result<()> {
        if dir.is_dir() {
            for entry in fs::read_dir(dir)? {
                let entry = entry?;
                let path = entry.path();
                if path.is_dir() {
                    visit_dirs(&path)?;
                } else {
                    println!("{}", path.display());
                }
            }
        }
        Ok(())
    }

    visit_dirs(Path::new("."))?;

    // 复制文件
    fs::copy("input.txt", "input_backup.txt")?;

    // 重命名/移动文件
    fs::rename("old_name.txt", "new_name.txt")?;

    // 删除文件
    fs::remove_file("temp.txt")?;

    // 创建目录
    fs::create_dir_all("path/to/dir")?;

    // 删除目录
    fs::remove_dir_all("path/to/dir")?;

    // 获取文件元数据
    let metadata = fs::metadata("input.txt")?;
    println!("大小: {} bytes", metadata.len());
    println!("是文件: {}", metadata.is_file());
    println!("是目录: {}", metadata.is_dir());

    Ok(())
}
```

### 15.5 HTTP 客户端

```rust
// Cargo.toml:
// [dependencies]
// reqwest = { version = "0.11", features = ["json"] }
// tokio = { version = "1", features = ["full"] }
// serde = { version = "1", features = ["derive"] }

use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
struct Post {
    id: u32,
    title: String,
    body: String,
    #[serde(rename = "userId")]
    user_id: u32,
}

#[derive(Debug, Serialize)]
struct NewPost {
    title: String,
    body: String,
    #[serde(rename = "userId")]
    user_id: u32,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // GET 请求
    let response = reqwest::get("https://jsonplaceholder.typicode.com/posts/1")
        .await?
        .json::<Post>()
        .await?;
    println!("GET: {:?}", response);

    // POST 请求
    let client = reqwest::Client::new();
    let new_post = NewPost {
        title: "foo".to_string(),
        body: "bar".to_string(),
        user_id: 1,
    };

    let response = client
        .post("https://jsonplaceholder.typicode.com/posts")
        .json(&new_post)
        .send()
        .await?
        .json::<Post>()
        .await?;
    println!("POST: {:?}", response);

    // 带 headers
    let response = client
        .get("https://api.example.com/data")
        .header("Authorization", "Bearer token123")
        .header("Content-Type", "application/json")
        .send()
        .await?;

    // 处理响应
    let status = response.status();
    let headers = response.headers().clone();
    let body = response.text().await?;

    println!("Status: {}", status);
    println!("Headers: {:?}", headers);
    println!("Body: {}", body);

    Ok(())
}
```

---

## 附录：常用 Crate 推荐

| 类别        | Crate                    | 用途                  |
| ----------- | ------------------------ | --------------------- |
| 序列化      | serde, serde_json        | JSON/YAML/TOML 序列化 |
| 异步运行时  | tokio, async-std         | 异步编程              |
| Web 框架    | axum, actix-web, rocket  | Web 服务              |
| HTTP 客户端 | reqwest                  | HTTP 请求             |
| 数据库      | sqlx, diesel, rusqlite   | 数据库操作            |
| 命令行      | clap, structopt          | CLI 参数解析          |
| 日志        | log, tracing, env_logger | 日志记录              |
| 错误处理    | thiserror, anyhow        | 错误类型定义          |
| 时间日期    | chrono, time             | 时间处理              |
| 正则表达式  | regex                    | 正则匹配              |
| 随机数      | rand                     | 随机数生成            |
| 加密        | ring, rustls             | 加密/TLS              |
| 测试        | mockall, proptest        | 测试工具              |

---

## 学习资源

1. **官方文档**
   - [The Rust Programming Language](https://doc.rust-lang.org/book/) - 官方教程
   - [Rust by Example](https://doc.rust-lang.org/rust-by-example/) - 示例学习
   - [Rustlings](https://github.com/rust-lang/rustlings) - 练习题

2. **进阶资源**
   - [The Rustonomicon](https://doc.rust-lang.org/nomicon/) - 高级/不安全 Rust
   - [Async Book](https://rust-lang.github.io/async-book/) - 异步编程
   - [Too Many Linked Lists](https://rust-unofficial.github.io/too-many-lists/) - 数据结构

3. **社区**
   - [Rust 中文社区](https://rustcc.cn/)
   - [Rust 语言中文版](https://kaisery.github.io/trpl-zh-cn/)

---

> 本教程持续更新中，祝你 Rust 学习愉快！🦀
