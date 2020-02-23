#![warn(rust_2018_idioms)]

use std::io::{self, Read, BufReader};
use std::fs::File;
use std::vec::{Vec};
use std::str::{from_utf8};
use std::iter::repeat;

use nom::{
	do_parse,
	tag,
	named,
	take_until,
	take_while,
	many_till,
};
named!{ white_space,
	take_while!(|c| c == b' ' || c == b'\t' || c == b'\n')
}

named!{ column_name, do_parse!(
	take_until!(&b"<th scope=\"col\""[..]) >>
	take_until!(&b">"[..]) >> tag!(&b">"[..]) >>
	white_space >>
	a: take_until!(&b"</th>"[..]) >>
	tag!(&b"</th>"[..]) >>
	white_space >>
	(a)
)}

named!{ header_chunk<Vec<&[u8]>>, do_parse!(
	take_until!(&b"<thead>"[..]) >>
	take_until!(&b"<tr>"[..]) >>
	tag!(&b"<tr>"[..]) >>
	test: many_till!(column_name, tag!(&b"</tr>"[..])) >>
	take_until!(&b"</thead>"[..]) >>
	take_until!(&b"<tbody>"[..]) >> tag!(&b"<tbody>"[..]) >>
	(test.0)
)}

named!{ td, do_parse!(
	take_until!(&b"<td"[..]) >> take_until!(&b">"[..]) >> tag!(&b">"[..]) >>
	white_space >>
	a: take_until!(&b"</td>"[..]) >> tag!(&b"</td>"[..]) >>
	white_space >>
	(a)
)}

named!{ tr<Vec<&[u8]>>, do_parse!(
	take_until!(&b"<tr>"[..]) >> tag!(&b"<tr>"[..]) >>
	a: many_till!(td, tag!(&b"</tr>"[..])) >>
	(a.0)
)}

fn main() -> io::Result<()> {
	let file = File::open("./findTheaterInfoListXls.do")?;
	// let mut reader = BufReader::new(file);
	// let mut contents = String::new();
	// reader.read_to_string(&mut contents)?;
	// println!("{:?}", contents);
	let uu: Vec<u8> = file.bytes().filter_map(|v| v.ok()).collect();

	let (rest, chunk) = header_chunk(uu.as_slice()).unwrap();
	println!("{:?}", chunk.iter().filter_map(|x| from_utf8(x).ok()).collect::<Vec<&str>>());

	let res = repeat(tr).scan(rest, |rest, parser| {
		match parser(rest) {
			Ok((new_rest, row)) => {
				*rest = new_rest;
				Some(row)
			},
			Err(_) => None
		}
	});
	res.for_each(|row| {
		println!("{:?}", row.iter().filter_map(|x| from_utf8(x).ok()).collect::<Vec<&str>>());
	});
	Ok(())
}

// http://www.kobis.or.kr/kobis/business/mast/thea/findTheaterInfoList.do&sJoinYn=Y&sSaleStat=018201
