/* Dữ liệu PLU – chép nguyên văn từ ảnh "PLU CODE" (Updated 20/08/2026).
   Nếu hệ thống đã có nguồn PLU chuẩn, đặt window.PLU_SOURCE trước file này
   (dạng [{code,name,cat,img?}]) thì file này sẽ không ghi đè.
   Mục có dấu ? ở cuối = ảnh mờ/khó đọc, cần đối chiếu lại với bản in. */
(function () {
  if (window.PLU_SOURCE) return;
  var RAW = {
    "Trái cây": "152|Bưởi da xanh;119|Lê đường;117|Cam Navel;187|Cam Sành Vắt Nước;184|Chuối Sứ;190|Chuối Cau;128|Cóc thái;158|Đu Đủ ruột vàng;109|Dưa lưới ruột cam;139|Dưa lưới vàng;108|Ổi Đài Loan;129|Quýt canh;178|Quýt đường;120|Quýt giống thái;130|Quýt sim;100|Táo Gala;179|Thanh long ruột đỏ;153|Thanh long ruột trắng;157|Mít;105|Cam sành;106|Chuối già giống Nam Mỹ;107|Dưa hấu Hắc Mỹ Nhân;104|Quýt giống Úc;101|Táo Fuji Nam Phi",
    "Trái cây mùa vụ": "116|Sầu riêng;193|Bơ 34;195|Bơ booth;150|Bơ sáp;156|Chôm Chôm Thái;114|Vải;125|Hồng giòn;141|Nhãn Thái Ido;171|Xoài 3 mùa;110|Xoài cát chu;155|Xoài keo;174|Xoài Tứ Quý;124|Lựu đỏ;181|Vú sữa;176?|Dừa xiêm gọt;162|Mận An Phước;132|Mận Hậu;333|Chanh có hạt;222|Chanh không hạt;271|Gừng;223|Hành tây;166|Măng cụt;123|Nho Mẫu Đơn;161|Mít tố nữ;133|Táo Ninh Thuận (Hộp);134|Chôm Chôm Thái (Hộp);135|Trái Đào (Hộp)",
    "Rau củ": "210|Cải thảo;211?|Bắp cải trắng;255|Bắp cải trắng size lớn;200|Cà chua;201|Dưa leo;207|Mướp hương;203|Bầu Sao;202|Bí đao;205|Bí đỏ hồ lô;265|Khoai lang giống Nhật size lớn;224|Khoai lang Nhật (Túi 3 củ);206|Khoai tây;204?|Cà rốt;259|Củ cải trắng;269?|Su Su;270|Bắp Mỹ (Trái);347|Ớt hiểm;218|Giá;331|Đậu bắp;272|Khổ Qua;348|Sả Cây",
    "Trứng": "355|Trứng vịt xá;375|Trứng gà ta;340|Trứng gà nâu hộp 10;343|Trứng gà xá;360|Trứng vịt hộp 6",
    "Gạo": "704|Gạo nở Maxidi-bao hồng 25kg;705|Gạo dẻo Maxidi-bao cam 25kg;709|Gạo ST25 PLUS túi 5kg;701|Gạo nở mềm Maxidi túi 5kg;702|Gạo dẻo thơm Maxidi túi 5kg",
    "Bún + đậu hũ": "335|Bún tươi gói 500g;015|Đậu hũ trắng;016|Đậu hũ chiên",
    "Hàng mát + đông": "462|Kem ốc quế hoa socola;463|Kem ốc quế hoa dâu;404|Dồi sụn 250g;405|Kem chuối sữa dừa Maxidi 80g;467|Xúc xích phô mai HD FOOD 85g;468|Phô mai que HD Food 142g",
    "Bột hòa tan": "840|Trà chanh cozy;839|Trà Đào Hoà Tan 15gr;870|Ngũ Cốc Đậu Xanh Hạt Sen;809|Ngũ cốc Euro Cereal 25g;889|Ngũ cốc gạo lứt",
    "Bánh kẹo (Trung Quốc)": "943|Bánh quy hỗn hợp;927|Thanh rong biển kẹp hạt T 14gr;928|Thanh gạo lứt hạt chà bông T 18gr;930|Bánh thuyền hạt dinh dưỡng Happy 18gr;900|Bánh dorayaki mini đậu đỏ/môn/k.lang 16g;975|Bánh mochi vị socola 20 gr;982|Bánh mochi kem vị cam 20gr;983|Bánh mochi kem vị chuối 20gr;984|Bánh mochi kem vị dừa 20gr;991|Bánh mochi kem vị việt quất 20gr;939|Kẹo dẻo có nhân hình mắt",
    "Bánh kẹo (lẻ/xá)": "918|Bánh đậu xanh Quê Hương 10gr;926|Socola bánh quy Sobi 9gr (thùng 4kg);916|Bánh ChocoPN socola vị dưa hấu 17g;902|Bánh ChocoPN Pham Nguyen socola 18G;942|Bánh gạo AN phô mai 8gr;929|Bánh gạo AN tảo biển 8gr;941|Bánh gạo cuộn rong biển Want Want 17g;914|Bánh gạo Ichi vị mật ong 15gr;901|Bánh gạo ngọt One One 10gr;934|Bánh Karo bơ trứng giòn 15gr (túi 270g);933|Bánh trứng Tipo 10gr (túi 500g);925|Bắp rang bơ ly 70gr;909|Kẹo bạc hà nhân socola Dynamite;906|Kẹo mút trái cây Chupa Chups 9.3g;912|Bánh pía hỗn hợp",
    "Thạch rau câu": "955|Thạch kem tươi Long Hải;923|Rau câu Caramel 16gr;908|Thạch rau câu Long Hải Kimiko;910|Thạch rau câu Long Hải Kimiko thanh;977|Thạch rau câu 3D;907|Thạch rau câu Long Hải",
    "Xúc xích": "904|Xúc xích Red CP heo 40g;903|Xúc xích CP gà vị tiêu 35g",
    "Non-food": "600|Tăm nhọn 2 đầu gói 20G;610|Bông tẩy trang 222 miếng;601|Bịch bông rái tay Sky;533|Dầu gội ramus"
  };
  var out = [], seen = {};
  Object.keys(RAW).forEach(function (cat) {
    RAW[cat].split(";").forEach(function (s) {
      var p = s.split("|"), chk = /\?$/.test(p[0]), code = p[0].replace("?", "");
      var it = { code: code, name: p[1], cat: cat, chk: chk };
      if (seen[code]) it.dup = seen[code];   /* xung đột: trùng mã */
      else seen[code] = p[1];
      out.push(it);
    });
  });
  window.PLU_SOURCE = out;
})();