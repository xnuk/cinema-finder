#![warn(rust_2018_idioms)]

// use hyper::{Client, Uri};

// #[tokio::main]
// async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
// 	let client = Client::new();
// 	let url = Uri::from_static(
// 		"http://www.kobis.or.kr/kobis/business/mast/thea/findTheaterInfoListXls.do?sSaleStat=018201"
// 	);
// 	let future = client.get(url).await?;
// 	println!("status: {}", future.status());
// 	Ok(())
// }

use http::request::{Request};
use tokio::net::{TcpStream};
use tokio::io::{AsyncBufReadExt, AsyncWriteExt, BufReader};
use tokio::stream::{StreamExt};

use reqwest::header::{ACCEPT, USER_AGENT};
use reqwest::{Client};
use serde::Deserialize;

#[derive(Deserialize, Debug)]
struct DNSAnswer {
	data: String,
}

#[derive(Deserialize, Debug)]
struct DNS {
	Answer: Vec<DNSAnswer>,
}

async fn get_dns() -> Result<String, Box<dyn std::error::Error + Send + Sync>> {
	let DNS {Answer} = Client::new().get(
		"https://cloudflare-dns.com/dns-query?name=www.kobis.or.kr&type=A"
	).header(ACCEPT, "application/dns-json").send().await?.json::<DNS>().await?;

	let DNSAnswer {data} = Answer.get(0).unwrap();
	Ok(data.to_string())
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
	{
		let ip = get_dns().await?;
		println!("{:?}", ip);
		let mut stream = TcpStream::connect((ip.as_str(), 80)).await?;
		stream.write_all(b"\
			GET /kobis/business/mast/thea/findTheaterInfoListXls.do\
				?sSaleStat=018201 HTTP/1.1\r\n\
			Host: www.kobis.or.kr\r\n\
			User-Agent: Thanks/99.0\r\n\
			\r\n\
		").await?;
		let response = BufReader::new(stream);
		response.lines()
			.filter_map(|x| {
				println!("{:?}", x);
				x.ok()
			})
			.take_while(|line| !line.starts_with('<'))
			.fold((), |_, _| ()).await;
	}
	Ok(())
}
